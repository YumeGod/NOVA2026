from copy import deepcopy
import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from app.database import Base, get_db
from app.main import app
from app.models import Employee, Proposal
from app.schemas import Scenario, EmployeeInput
from app.services.seed import seed
from app.services.data import state, save
from app.services.analytics import menu_analysis, overview
from app.services.staffing import staffing, can_prepare
from app.services.simulator import simulate

@pytest.fixture
def db():
    engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine,expire_on_commit=False) as session:
        seed(session)
        yield session
    engine.dispose()
@pytest.fixture
def client(db):
    app.dependency_overrides[get_db]=lambda: db
    with TestClient(app) as c: yield c
    app.dependency_overrides.clear()

def test_recipe_contribution(db):
    dish=menu_analysis(state(db))['dishes'][0]
    expected=180*.009+100*.002+60*.004+10*.01
    assert dish['ingredient_cost']==round(expected,2)
    assert dish['contribution_per_dish']==round(24-expected,2)
    assert dish['food_cost_percentage']==round(expected/24*100,2)
    assert dish['weekly_contribution']==round((24-expected)*95,2)

def test_aggregation(db):
    s=state(db); m=overview(s)
    assert m['revenue']==sum(d['selling_price']*d['weekly_sales_volume'] for d in s['menu'] if d['is_active'])
    assert m['labor_cost']==3778
    assert m['operating_result']==round(m['contribution']-3778-1850,2)

def test_skill_coverage(db):
    s=state(db); c=staffing(s)
    assert 'Chocolate fondant' in c['single_points_of_failure']
    assert 'handmade pasta' in c['recommended_skills']
    assert not c['uncovered_dishes']

def test_hire(db):
    s=state(db)
    result=simulate(s,Scenario(type='hire',employee=EmployeeInput(name='Hypothetical',role='Chef',hourly_wage=22,weekly_hours=30,skills=[{'name':'handmade pasta','proficiency':3}])))
    assert result['delta']['labor_cost']==660
    assert result['delta']['revenue']==0
    assert result['delta']['operating_result']==-660
    assert next(d for d in result['coverage_after']['dishes'] if d['name']=='Fresh egg ravioli')['employee_ids']==[-1]

def test_remove_employee(db):
    result=simulate(state(db),Scenario(type='remove_employee',employee_id=2))
    assert result['delta']['labor_cost']==-660
    assert set(result['lost_dishes'])=={'Chocolate fondant','Lemon butter cake'}
    assert result['delta']['revenue']==0

def test_hours_zero_removes_coverage(db):
    result=simulate(state(db),Scenario(type='change_hours',employee_id=2,hours=0))
    assert 'Chocolate fondant' in result['lost_dishes']

def test_remove_menu(db):
    result=simulate(state(db),Scenario(type='remove_dishes',dish_ids=[1,2]))
    assert result['delta']['revenue']==-(24*95+23*110)
    assert result['after']['active_dishes']==7

def test_change_price(db):
    r=simulate(state(db),Scenario(type='change_price',dish_ids=[4],price=24))
    assert r['delta']['revenue']==250
    assert r['delta']['food_cost']==0

def test_add_dish(db):
    s=state(db); dish={k:v for k,v in s['menu'][0].items() if k not in ('id','restaurant_id')};dish['weekly_sales_volume']=10
    result=simulate(s,Scenario(type='add_dish',dish=dish))
    assert result['delta']['revenue']==240

def test_scenario_isolation(db):
    s=state(db); before=deepcopy(s)
    simulate(s,Scenario(type='remove_employee',employee_id=1))
    simulate(s,Scenario(type='remove_dishes',dish_ids=[1]))
    assert s==before
    assert state(db)==before

def test_unknown_and_zero(db):
    s=state(db);s['ingredients'][0]['unit_cost']=None
    assert overview(s)['food_cost'] is None
    assert overview(s)['operating_result'] is None
    s['menu'][0]['selling_price']=0
    assert menu_analysis(s)['dishes'][0]['food_cost_percentage'] is None
    s['menu'][0]['weekly_sales_volume']=None
    assert overview(s)['revenue'] is None
    assert overview({**s,'menu':[],'employees':[]})['revenue']==0

def test_missing_recipe_is_unknown(db):
    s=state(db);s['menu'][0]['recipe']=[]
    assert menu_analysis(s)['dishes'][0]['ingredient_cost'] is None

@pytest.mark.parametrize('data',[{'type':'hire'},{'type':'change_hours','employee_id':1,'hours':-1},{'type':'change_price','dish_ids':[1,2],'price':20},{'type':'remove_employee','employee_id':1,'price':10},{'type':'remove_dishes','dish_ids':[]}])
def test_validation(data):
    with pytest.raises(ValidationError): Scenario(**data)

def test_deleted_inactive(db):
    with pytest.raises(ValueError): simulate(state(db),Scenario(type='remove_dishes',dish_ids=[10]))
    with pytest.raises(ValueError): simulate(state(db),Scenario(type='remove_employee',employee_id=999))

def test_crud(client,db):
    response=client.post('/api/employees',json={'name':'New cook','role':'Cook','hourly_wage':20,'weekly_hours':10,'skills':[{'name':'prep','proficiency':2}]})
    assert response.status_code==201
    id=response.json()['id']
    assert client.patch(f'/api/employees/{id}',json={'weekly_hours':12}).json()['weekly_hours']==12
    assert client.patch(f'/api/employees/{id}',json={'hourly_wage':-5}).status_code==422
    assert client.delete(f'/api/employees/{id}').status_code==200
    assert db.get(Employee,id) is None
    assert client.delete('/api/ingredients/1').status_code==409
    assert client.patch('/api/ingredients/1',json={'unit':'each'}).status_code==409

def test_api_contracts(client,db):
    for url in ['/state','/restaurant','/employees','/menu','/ingredients','/analytics/overview','/analytics/menu','/analytics/staffing','/analytics/hiring','/conversations','/simulations']:
        assert client.get('/api'+url).status_code==200
    before=state(db)
    response=client.post('/api/simulations',json={'type':'remove_employee','employee_id':2})
    assert response.status_code==201
    assert response.json()['lost_dishes']
    assert state(db)==before
    assert client.post('/api/simulations',json={'type':'change_price','dish_ids':[1],'price':-1}).status_code==422

def test_missing_ai_persisted(client,monkeypatch):
    monkeypatch.delenv('OPENROUTER_API_KEY',raising=False)
    c=client.post('/api/conversations').json()['id']
    r=client.post(f'/api/conversations/{c}/messages',json={'content':'How profitable are we?'})
    assert r.status_code==200
    assert r.json()['payload']['source']=='configuration'
    assert len(client.get(f'/api/conversations/{c}/messages').json())==2

def test_real_orchestration_with_stub_provider(client,monkeypatch,db):
    import app.services.ai_service as service
    calls=[]
    async def completion(messages,json_mode=False):
        calls.append(messages)
        if json_mode: return '{"intent":"simulation","scenario":{"type":"remove_employee","employee_id":2}}'
        assert '660' in messages[1]['content']
        return 'This scenario saves $660 in weekly wages, with a pastry capability risk.'
    monkeypatch.setattr(service,'completion',completion)
    before=state(db)
    c=client.post('/api/conversations').json()['id']
    r=client.post(f'/api/conversations/{c}/messages',json={'content':'What if Maria leaves the schedule?'}).json()
    assert r['payload']['analysis']['simulation']['delta']['labor_cost']==-660
    assert len(calls)==2
    assert state(db)==before

def test_confirmation_only(client,db):
    p=Proposal(kind='employee',data={'name':'Confirmed cook','role':'Cook','hourly_wage':18,'weekly_hours':12,'skills':[]},record_id=None)
    db.add(p);db.commit()
    before=len(state(db)['employees'])
    assert client.post(f'/api/proposals/{p.id}/confirm').status_code==200
    assert len(state(db)['employees'])==before+1
    assert client.post(f'/api/proposals/{p.id}/confirm').status_code==409

def test_invalid_model_output(client,monkeypatch):
    import app.services.ai_service as service
    async def completion(*args,**kwargs): return '{"intent":"execute_sql","query":"DROP TABLE employees"}'
    monkeypatch.setattr(service,'completion',completion)
    c=client.post('/api/conversations').json()['id']
    r=client.post(f'/api/conversations/{c}/messages',json={'content':'Hello'}).json()
    assert 'invalid action' in r['content']

def test_financial_reconciliation(db):
    m=overview(state(db))
    assert round(m['revenue']-m['food_cost'],2)==m['contribution']
    for d in menu_analysis(state(db))['dishes']:
        if d['weekly_contribution'] is not None:
            assert round(d['weekly_revenue']-d['weekly_ingredient_cost'],2)==d['weekly_contribution']

def test_ingredient_usage(db):
    r=simulate(state(db),Scenario(type='remove_dishes',dish_ids=[1]))
    chicken=next(i for i in r['ingredient_usage_changes'] if i['id']==1)
    assert chicken['before']-chicken['after']==180*95

def test_innovation_preview_unknown_inventory(db):
    from app.services.menu_optimizer import preview_dish
    s=state(db);s['ingredients'][0]['inventory_quantity']=None
    d={k:v for k,v in s['menu'][0].items() if k not in ('id','restaurant_id')}
    result=preview_dish(s,d)
    assert result['inventory_status']=='unknown'
    assert result['capable_employees']
    assert result['ingredient_cost']==2.16

def test_openrouter_http_transport(monkeypatch):
    import asyncio, httpx
    import app.services.ai_service as service
    monkeypatch.setenv('OPENROUTER_API_KEY','test-key-not-real')
    monkeypatch.setenv('OPENROUTER_MODEL','configured/test-model')
    original=httpx.AsyncClient
    def handle(request):
        import json
        assert str(request.url)=='https://openrouter.ai/api/v1/chat/completions'
        assert request.headers['Authorization']=='Bearer test-key-not-real'
        body=json.loads(request.content)
        assert body['model']=='configured/test-model'
        assert body['response_format']=={'type':'json_object'}
        return httpx.Response(200,json={'choices':[{'message':{'content':'{"intent":"staffing"}'}}]})
    monkeypatch.setattr(service.httpx,'AsyncClient',lambda **kw:original(transport=httpx.MockTransport(handle),**kw))
    assert asyncio.run(service.completion([{'role':'user','content':'Hi'}],True))=='{"intent":"staffing"}'

def test_openrouter_error_is_safe(monkeypatch):
    import asyncio, httpx
    import app.services.ai_service as service
    monkeypatch.setenv('OPENROUTER_API_KEY','test-key-not-real')
    monkeypatch.setenv('OPENROUTER_MODEL','configured/test-model')
    original=httpx.AsyncClient
    monkeypatch.setattr(service.httpx,'AsyncClient',lambda **kw:original(transport=httpx.MockTransport(lambda request:httpx.Response(401,json={'error':'secret provider message'})),**kw))
    with pytest.raises(service.AIUnavailable) as error: asyncio.run(service.completion([]))
    assert 'secret' not in str(error.value)

def test_invalid_json_is_repaired_once(client,monkeypatch):
    import app.services.ai_service as service
    routing_calls=[]
    async def completion(messages,json_mode=False):
        if json_mode:
            routing_calls.append(messages)
            return '{"intent":' if len(routing_calls)==1 else '{"intent":"profitability"}'
        return 'The computed operating result excludes unrecorded costs.'
    monkeypatch.setattr(service,'completion',completion)
    c=client.post('/api/conversations').json()['id']
    result=client.post(f'/api/conversations/{c}/messages',json={'content':'How profitable are we?'}).json()
    assert result['payload']['source']=='ai'
    assert len(routing_calls)==2
    assert result['payload']['analysis']['overview']['operating_result']==5844.32

def test_innovation_requires_action_not_invented_narrative():
    from app.schemas import Intent
    with pytest.raises(ValidationError): Intent(intent='innovation',assumptions=['Invented proposed price'])
    assert Intent(intent='innovation',follow_up_question='Which ingredients are available?')
