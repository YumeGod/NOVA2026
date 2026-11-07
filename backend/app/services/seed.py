from app.models import Restaurant
from app.services.data import save

def seed(db):
    if db.get(Restaurant,1): return
    db.add(Restaurant(id=1,name='Juniper Kitchen',cuisine_type='Seasonal American',description='A neighborhood kitchen celebrating seasonal ingredients and good company.',operating_days=6,weekly_fixed_costs=1850,goals='Improve operating margin while protecting our seasonal menu.')); db.flush()
    ingredients=[('Chicken breast','g',.009,18000),('Salmon','g',.026,9000),('Beef','g',.025,12000),('Pasta','g',.003,16000),('Rice','g',.002,12000),('Mixed greens','g',.008,6000),('Tomato','g',.004,10000),('Mushroom','g',.012,6000),('Cream','ml',.006,7000),('Butter','g',.01,5000),('Flour','g',.0015,10000),('Egg','each',.3,160),('Chocolate','g',.014,5000),('Lemon','g',.004,4000),('Olive oil','ml',.01,5000),('Parmesan','g',.018,4000)]
    for name,unit,cost,inventory in ingredients: save(db,'ingredient',dict(name=name,unit=unit,unit_cost=cost,inventory_quantity=inventory,reorder_threshold=inventory*.15))
    dishes=[
      ('Herb grilled chicken','Mains',24,95,'grilling',[(1,180),(5,100),(7,60),(15,10)],18),
      ('Lemon butter salmon','Mains',23,110,'seafood',[(2,220),(10,25),(14,30),(5,100),(15,10)],20),
      ('Steak & mushrooms','Mains',32,55,'grilling',[(3,220),(8,100),(10,20),(15,10)],24),
      ('Wild mushroom pasta','Mains',22,125,'pasta',[(4,150),(8,90),(9,60),(16,20),(15,10)],15),
      ('Garden harvest salad','Salads',15,75,'prep',[(6,120),(7,80),(14,20),(15,15)],8),
      ('Chicken grain bowl','Bowls',19,90,'grilling',[(1,140),(5,100),(6,50),(7,60),(15,10)],12),
      ('Chocolate fondant','Desserts',12,35,'pastry',[(13,60),(10,30),(11,20),(12,1)],20),
      ('Lemon butter cake','Desserts',10,25,'baking',[(11,70),(10,40),(12,1),(14,40),(9,20)],15),
      ('Creamy tomato soup','Starters',11,65,'prep',[(7,250),(9,50),(15,10)],12),
      ('Fresh egg ravioli','Seasonal ideas',26,0,'handmade pasta',[(11,120),(12,2),(16,30),(8,80)],30)]
    for name,cat,price,volume,sk,recipe,prep in dishes:
        save(db,'menu',dict(name=name,category=cat,selling_price=price,weekly_sales_volume=volume,is_active=cat!='Seasonal ideas',prep_time_minutes=prep,skills=[dict(name=sk,proficiency=2)],recipe=[dict(ingredient_id=i,quantity_required=q) for i,q in recipe]))
    employees=[('Alex Rivera','Head chef',25,38,['grilling','pasta','seafood','prep']),('Maria Chen','Pastry chef',22,30,['pastry','baking','prep']),('Ben Davis','Line cook',19,32,['prep','grilling']),('Sam Patel','Line cook',20,30,['pasta','prep']),('Jordan Lee','Service lead',18,32,['service']),('Taylor Brooks','Host & runner',16,24,['service','prep'])]
    for name,role,wage,hours,skills in employees:
        save(db,'employee',dict(name=name,role=role,hourly_wage=wage,weekly_hours=hours,skills=[dict(name=s,proficiency=3) for s in skills]))
    db.commit()
