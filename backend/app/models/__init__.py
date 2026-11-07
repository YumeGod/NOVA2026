from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Boolean, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

def now(): return datetime.now(timezone.utc)
class Restaurant(Base):
    __tablename__='restaurants'
    id=Column(Integer, primary_key=True)
    name=Column(String, nullable=False)
    cuisine_type=Column(String, default='Seasonal American')
    description=Column(String, default='')
    operating_days=Column(Integer, default=6)
    weekly_fixed_costs=Column(Float, nullable=True)
    goals=Column(String, default='')
    created_at=Column(DateTime, default=now)
class Skill(Base):
    __tablename__='skills'
    id=Column(Integer, primary_key=True)
    name=Column(String, unique=True, nullable=False)
class Employee(Base):
    __tablename__='employees'
    id=Column(Integer, primary_key=True)
    restaurant_id=Column(ForeignKey('restaurants.id'), nullable=False, default=1)
    name=Column(String, nullable=False)
    role=Column(String, nullable=False)
    hourly_wage=Column(Float, nullable=False)
    weekly_hours=Column(Float, nullable=False)
    availability=Column(String, default='')
    skills=relationship('EmployeeSkill', cascade='all, delete-orphan')
    dishes=relationship('EmployeeDishCapability', cascade='all, delete-orphan')
class EmployeeSkill(Base):
    __tablename__='employee_skills'
    employee_id=Column(ForeignKey('employees.id', ondelete='CASCADE'), primary_key=True)
    skill_id=Column(ForeignKey('skills.id'), primary_key=True)
    proficiency_level=Column(Integer, default=1)
    skill=relationship('Skill')
class EmployeeDishCapability(Base):
    __tablename__='employee_dishes'
    employee_id=Column(ForeignKey('employees.id', ondelete='CASCADE'), primary_key=True)
    dish_id=Column(ForeignKey('menu_items.id', ondelete='CASCADE'), primary_key=True)
class Ingredient(Base):
    __tablename__='ingredients'
    id=Column(Integer, primary_key=True)
    restaurant_id=Column(ForeignKey('restaurants.id'), default=1, nullable=False)
    name=Column(String, nullable=False)
    unit=Column(String, nullable=False)
    unit_cost=Column(Float, nullable=True)
    inventory_quantity=Column(Float, nullable=True)
    reorder_threshold=Column(Float, nullable=True)
class MenuItem(Base):
    __tablename__='menu_items'
    id=Column(Integer, primary_key=True)
    restaurant_id=Column(ForeignKey('restaurants.id'), default=1, nullable=False)
    name=Column(String, nullable=False)
    category=Column(String, nullable=False)
    selling_price=Column(Float, nullable=False)
    weekly_sales_volume=Column(Float, nullable=True)
    prep_time_minutes=Column(Float, nullable=True)
    is_active=Column(Boolean, default=True)
    recipe=relationship('RecipeIngredient', cascade='all, delete-orphan')
    skills=relationship('MenuItemSkillRequirement', cascade='all, delete-orphan')
class RecipeIngredient(Base):
    __tablename__='recipe_ingredients'
    menu_item_id=Column(ForeignKey('menu_items.id', ondelete='CASCADE'), primary_key=True)
    ingredient_id=Column(ForeignKey('ingredients.id'), primary_key=True)
    quantity_required=Column(Float, nullable=False)
class MenuItemSkillRequirement(Base):
    __tablename__='menu_skills'
    menu_item_id=Column(ForeignKey('menu_items.id', ondelete='CASCADE'), primary_key=True)
    skill_id=Column(ForeignKey('skills.id'), primary_key=True)
    minimum_proficiency=Column(Integer, default=1)
    skill=relationship('Skill')
class Conversation(Base):
    __tablename__='conversations'
    id=Column(Integer, primary_key=True)
    restaurant_id=Column(ForeignKey('restaurants.id'), default=1)
    title=Column(String, default='New conversation')
    created_at=Column(DateTime, default=now)
    updated_at=Column(DateTime, default=now, onupdate=now)
class Message(Base):
    __tablename__='messages'
    id=Column(Integer, primary_key=True)
    conversation_id=Column(ForeignKey('conversations.id', ondelete='CASCADE'))
    role=Column(String)
    content=Column(String)
    payload=Column(JSON, default=dict)
    created_at=Column(DateTime, default=now)
class Simulation(Base):
    __tablename__='simulations'
    id=Column(Integer, primary_key=True)
    restaurant_id=Column(ForeignKey('restaurants.id'), default=1)
    scenario_type=Column(String)
    parameters=Column(JSON)
    result=Column(JSON)
    created_at=Column(DateTime, default=now)
class Proposal(Base):
    __tablename__='proposals'
    id=Column(Integer, primary_key=True)
    kind=Column(String)
    record_id=Column(Integer, nullable=True)
    data=Column(JSON)
    applied=Column(Boolean, default=False)
