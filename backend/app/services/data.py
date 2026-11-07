from sqlalchemy import select
from fastapi import HTTPException
from app.models import *
from app.schemas import EmployeeInput, MenuInput, IngredientInput, RestaurantInput

def columns(obj): return {c.name:getattr(obj,c.name) for c in obj.__table__.columns if c.name not in ('created_at','updated_at')}
def serialize(obj):
    d=columns(obj)
    if isinstance(obj,(Employee,MenuItem)):
        d['skills']=[{'name':s.skill.name,'proficiency':getattr(s,'proficiency_level',getattr(s,'minimum_proficiency',1))} for s in obj.skills]
    if isinstance(obj,Employee): d['dish_ids']=[r.dish_id for r in obj.dishes]
    if isinstance(obj,MenuItem): d['recipe']=[{'ingredient_id':r.ingredient_id,'quantity_required':r.quantity_required} for r in obj.recipe]
    return d

def state(db):
    return {'restaurant':serialize(db.get(Restaurant,1)), 'employees':[serialize(x) for x in db.scalars(select(Employee))], 'menu':[serialize(x) for x in db.scalars(select(MenuItem))], 'ingredients':[serialize(x) for x in db.scalars(select(Ingredient))]}

def skill(db,name):
    name=name.strip().lower()
    obj=db.scalar(select(Skill).where(Skill.name==name))
    if obj is None:
        obj=Skill(name=name); db.add(obj); db.flush()
    return obj

def validate_refs(db,kind,data):
    if kind=='menu':
        ids=[r['ingredient_id'] for r in data['recipe']]
        if len(ids)!=len(set(ids)): raise HTTPException(422,'Recipe contains duplicate ingredients')
        if any(db.get(Ingredient,i) is None for i in ids): raise HTTPException(422,'An ingredient no longer exists')
    if kind=='employee':
        if len(data['dish_ids'])!=len(set(data['dish_ids'])): raise HTTPException(422,'Duplicate dish capabilities')
        if any(db.get(MenuItem,i) is None for i in data['dish_ids']): raise HTTPException(422,'A dish no longer exists')
    if 'skills' in data:
        names=[s['name'].strip().lower() for s in data['skills']]
        if len(names)!=len(set(names)) or any(not n for n in names): raise HTTPException(422,'Skills must be unique and nonempty')

def save(db,kind,data,record_id=None):
    cls,schema={'employee':(Employee,EmployeeInput),'menu':(MenuItem,MenuInput),'ingredient':(Ingredient,IngredientInput),'restaurant':(Restaurant,RestaurantInput)}[kind]
    data=schema.model_validate(data).model_dump()
    validate_refs(db,kind,data)
    obj=db.get(cls,record_id) if record_id is not None else cls()
    if obj is None: raise HTTPException(404,'Record not found')
    skills=data.pop('skills',None); recipe=data.pop('recipe',None); dishes=data.pop('dish_ids',None)
    for k,v in data.items(): setattr(obj,k,v)
    db.add(obj); db.flush()
    if skills is not None:
        obj.skills.clear(); db.flush()
        for s in skills:
            ident=skill(db,s['name']).id
            obj.skills.append(EmployeeSkill(skill_id=ident,proficiency_level=s['proficiency']) if kind=='employee' else MenuItemSkillRequirement(skill_id=ident,minimum_proficiency=s['proficiency']))
    if recipe is not None:
        obj.recipe.clear(); db.flush()
        obj.recipe=[RecipeIngredient(**r) for r in recipe]
    if dishes is not None:
        obj.dishes.clear(); db.flush()
        obj.dishes=[EmployeeDishCapability(dish_id=i) for i in dishes]
    db.flush(); db.refresh(obj)
    return serialize(obj)
