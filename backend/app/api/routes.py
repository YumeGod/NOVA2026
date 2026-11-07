from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from pydantic import ValidationError
from app.database import get_db
from app.models import *
from app.schemas import *
from app.services.data import state, serialize, save, validate_refs
from app.services.analytics import overview, menu_analysis
from app.services.staffing import staffing, hiring
from app.services.simulator import simulate
from app.services.seed import seed
from app.services.ai_service import advise, AIUnavailable, configured
router=APIRouter(prefix='/api')
DB=Depends(get_db)
@router.get('/health')
def health(): return {'status':'ok','ai_configured':configured(),'mode':'local_demo'}
@router.get('/state')
def get_state(db:Session=DB): return state(db)
@router.get('/restaurant')
def restaurant(db:Session=DB): return serialize(db.get(Restaurant,1))
@router.put('/restaurant')
def update_restaurant(body:RestaurantInput,db:Session=DB):
    result=save(db,'restaurant',body.model_dump(),1); db.commit(); return result

def register_crud(path,kind,model,schema):
    def listing(db:Session=DB): return [serialize(x) for x in db.scalars(select(model))]
    def create(body:dict,db:Session=DB):
        try: data=schema.model_validate(body).model_dump()
        except ValidationError: raise HTTPException(422,'Invalid fields. Check nonnegative amounts and required names.')
        result=save(db,kind,data); db.commit(); return result
    def patch(record_id:int,body:dict,db:Session=DB):
        obj=db.get(model,record_id)
        if not obj: raise HTTPException(404,'Record not found')
        prior=serialize(obj); prior.pop('id'); prior.pop('restaurant_id')
        if kind=='ingredient' and 'unit' in body and body['unit']!=prior['unit'] and db.scalar(select(RecipeIngredient).where(RecipeIngredient.ingredient_id==record_id)):
            raise HTTPException(409,'This ingredient is used by recipes. Keep its unit or update recipes before changing it.')
        try: data=schema.model_validate({**prior,**body}).model_dump()
        except ValidationError: raise HTTPException(422,'Invalid fields. Check nonnegative amounts and required names.')
        result=save(db,kind,data,record_id); db.commit(); return result
    def remove(record_id:int,db:Session=DB):
        obj=db.get(model,record_id)
        if not obj: raise HTTPException(404,'Record not found')
        if kind=='ingredient' and db.scalar(select(RecipeIngredient).where(RecipeIngredient.ingredient_id==record_id)):
            raise HTTPException(409,'Ingredient is used in a recipe. Remove it from recipes first.')
        db.delete(obj); db.commit(); return {'deleted':True}
    router.add_api_route(path,listing,methods=['GET'],name='list_'+kind)
    router.add_api_route(path,create,methods=['POST'],status_code=201,name='create_'+kind)
    router.add_api_route(path+'/{record_id}',patch,methods=['PATCH'],name='update_'+kind)
    router.add_api_route(path+'/{record_id}',remove,methods=['DELETE'],name='delete_'+kind)
register_crud('/employees','employee',Employee,EmployeeInput)
register_crud('/menu','menu',MenuItem,MenuInput)
register_crud('/ingredients','ingredient',Ingredient,IngredientInput)
@router.get('/analytics/overview')
def get_overview(db:Session=DB): return overview(state(db))
@router.get('/analytics/menu')
def get_menu(db:Session=DB): return menu_analysis(state(db))
@router.get('/analytics/staffing')
def get_staffing(db:Session=DB): return staffing(state(db))
@router.get('/analytics/hiring')
def get_hiring(db:Session=DB): return hiring(state(db))
@router.post('/simulations',status_code=201)
def simulation(body:Scenario,db:Session=DB):
    try: result=simulate(state(db),body)
    except ValueError as e: raise HTTPException(422,str(e))
    obj=Simulation(scenario_type=body.type,parameters=body.model_dump(),result=result); db.add(obj); db.commit()
    return {'id':obj.id,**result}
@router.get('/simulations')
def simulations(db:Session=DB): return [serialize(x) for x in db.scalars(select(Simulation).order_by(Simulation.id.desc()).limit(20))]
@router.get('/conversations')
def conversations(db:Session=DB): return [serialize(x) for x in db.scalars(select(Conversation).order_by(Conversation.id.desc()))]
@router.post('/conversations',status_code=201)
def new_conversation(db:Session=DB):
    obj=Conversation(); db.add(obj); db.commit(); return serialize(obj)
def check_conversation(db,id):
    obj=db.get(Conversation,id)
    if not obj: raise HTTPException(404,'Conversation not found')
    return obj
@router.get('/conversations/{id}/messages')
def messages(id:int,db:Session=DB):
    check_conversation(db,id)
    return [serialize(x) for x in db.scalars(select(Message).where(Message.conversation_id==id).order_by(Message.id))]
@router.post('/conversations/{id}/messages')
async def chat(id:int,body:ChatInput,db:Session=DB):
    conv=check_conversation(db,id)
    history=list(db.scalars(select(Message).where(Message.conversation_id==id).order_by(Message.id.desc()).limit(12)))[::-1]
    db.add(Message(conversation_id=id,role='user',content=body.content))
    if not history: conv.title=body.content[:64]
    db.commit()
    try:
        response=await advise(state(db),[{'role':m.role,'content':m.content[:6000]} for m in history]+[{'role':'user','content':body.content}])
        proposed=response.get('proposal')
        if proposed:
            schema=EmployeeInput if proposed['kind']=='employee' else MenuInput
            schema.model_validate(proposed['data']); validate_refs(db,proposed['kind'],proposed['data'])
            model=Employee if proposed['kind']=='employee' else MenuItem
            if proposed['record_id'] is not None and not db.get(model,proposed['record_id']): raise ValueError('Missing record')
            proposal=Proposal(**proposed); db.add(proposal); db.flush(); response['proposal']['id']=proposal.id
    except AIUnavailable as e: response={'message':str(e),'source':'configuration' if not configured() else 'error','actions':[]}
    except (ValueError,ValidationError,HTTPException): response={'message':'The proposed action did not pass validation. No business records were changed. Please retry with current records.','source':'error','actions':[]}
    obj=Message(conversation_id=id,role='assistant',content=response['message'],payload=response); db.add(obj); db.commit(); return serialize(obj)
@router.post('/proposals/{id}/confirm')
def confirm(id:int,db:Session=DB):
    proposal=db.get(Proposal,id)
    if not proposal: raise HTTPException(404,'Proposal not found')
    if proposal.applied: raise HTTPException(409,'This proposal was already applied')
    result=save(db,proposal.kind,proposal.data,proposal.record_id)
    proposal.applied=True; db.commit(); return result
@router.post('/demo/reset')
def reset(db:Session=DB):
    for model in [Proposal,Message,Conversation,Simulation,EmployeeDishCapability,EmployeeSkill,MenuItemSkillRequirement,RecipeIngredient,Employee,MenuItem,Ingredient,Skill,Restaurant]: db.execute(delete(model))
    db.commit(); seed(db); return {'status':'reset'}
