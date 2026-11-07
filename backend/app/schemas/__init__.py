from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator
class Strict(BaseModel):
    model_config=ConfigDict(extra='forbid', allow_inf_nan=False)
class SkillInput(Strict):
    name: str=Field(min_length=1,max_length=80)
    proficiency: int=Field(default=1,ge=1,le=5)
    @field_validator('name')
    @classmethod
    def normalize(cls,value):
        value=value.strip().lower()
        if not value: raise ValueError('Skill name cannot be blank')
        return value
class EmployeeInput(Strict):
    name: str=Field(min_length=1,max_length=100)
    role: str=Field(min_length=1,max_length=100)
    hourly_wage: float=Field(ge=0,le=1000)
    weekly_hours: float=Field(ge=0,le=168)
    skills: list[SkillInput]=Field(default_factory=list)
    dish_ids: list[int]=Field(default_factory=list)
    availability: str=''
    @model_validator(mode='after')
    def unique(self):
        if len(self.dish_ids)!=len(set(self.dish_ids)): raise ValueError('Duplicate dish capabilities')
        if len(self.skills)!=len({s.name for s in self.skills}): raise ValueError('Duplicate skills')
        return self
class IngredientInput(Strict):
    name: str=Field(min_length=1,max_length=100)
    unit: Literal['g','ml','each']
    unit_cost: float|None=Field(default=None,ge=0)
    inventory_quantity: float|None=Field(default=None,ge=0)
    reorder_threshold: float|None=Field(default=None,ge=0)
class RecipeInput(Strict):
    ingredient_id: int
    quantity_required: float=Field(gt=0)
class MenuInput(Strict):
    name: str=Field(min_length=1,max_length=100)
    category: str=Field(min_length=1,max_length=80)
    selling_price: float=Field(ge=0,le=10000)
    weekly_sales_volume: float|None=Field(default=None,ge=0)
    prep_time_minutes: float|None=Field(default=None,ge=0)
    is_active: bool=True
    recipe: list[RecipeInput]=Field(default_factory=list)
    skills: list[SkillInput]=Field(default_factory=list)
    @model_validator(mode='after')
    def unique(self):
        if len(self.recipe)!=len({r.ingredient_id for r in self.recipe}): raise ValueError('Duplicate recipe ingredients')
        if len(self.skills)!=len({s.name for s in self.skills}): raise ValueError('Duplicate skills')
        return self
class RestaurantInput(Strict):
    name: str=Field(min_length=1,max_length=100)
    cuisine_type: str
    description: str=''
    operating_days: int=Field(ge=1,le=7)
    weekly_fixed_costs: float|None=Field(default=None,ge=0)
    goals: str=''
class Scenario(Strict):
    type: Literal['hire','remove_employee','change_hours','remove_dishes','change_price','add_dish']
    employee_id: int|None=None
    dish_ids: list[int]=Field(default_factory=list)
    hours: float|None=Field(default=None,ge=0,le=168)
    price: float|None=Field(default=None,ge=0,le=10000)
    employee: EmployeeInput|None=None
    dish: MenuInput|None=None
    @model_validator(mode='after')
    def required(self):
        required={'hire':['employee'],'remove_employee':['employee_id'],'change_hours':['employee_id','hours'],'remove_dishes':['dish_ids'],'change_price':['dish_ids','price'],'add_dish':['dish']}[self.type]
        for key in required:
            if getattr(self,key) is None or getattr(self,key)==[]: raise ValueError(f'{key} is required for {self.type}')
        allowed=set(required)|{'type'}
        for key in self.model_fields_set-allowed:
            if getattr(self,key) is not None and getattr(self,key)!=[]: raise ValueError(f'{key} conflicts with {self.type}')
        if self.type=='change_price' and len(self.dish_ids)!=1: raise ValueError('Choose one dish for a price change')
        return self
class ChatInput(Strict):
    content: str=Field(min_length=1,max_length=8000)
class ProposedUpdate(Strict):
    kind: Literal['employee','menu']
    record_id: int|None=None
    employee: EmployeeInput|None=None
    dish: MenuInput|None=None
class Intent(Strict):
    intent: Literal['profitability','staffing','hiring','innovation','simulation','general','update']='general'
    follow_up_question: str|None=None
    scenario: Scenario|None=None
    proposal: ProposedUpdate|None=None
    assumptions: list[str]=Field(default_factory=list)

    @model_validator(mode='after')
    def action_required(self):
        if not self.follow_up_question:
            if self.intent=='simulation' and self.scenario is None:
                raise ValueError('simulation requires scenario parameters or a focused missing-information question')
            if self.intent in ('innovation','update') and self.proposal is None:
                raise ValueError('innovation/update requires a structured proposal, not only assumptions. For innovation return proposal.kind=menu and proposal.dish with suggested recipe quantities, known ingredient IDs, required skills and price; use null weekly_sales_volume. Ask a focused question only if essential resources are missing.')
        if self.proposal:
            if self.proposal.kind=='menu' and self.proposal.dish is None: raise ValueError('menu proposal requires dish')
            if self.proposal.kind=='employee' and self.proposal.employee is None: raise ValueError('employee proposal requires employee')
        return self
