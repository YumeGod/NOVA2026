from app.services.analytics import money

def can_prepare(e,d):
    if e['weekly_hours']<=0: return False
    if d['id'] in e.get('dish_ids',[]): return True
    levels={s['name'].lower():s['proficiency'] for s in e['skills']}
    return bool(d['skills']) and all(levels.get(s['name'].lower(),0)>=s['proficiency'] for s in d['skills'])

def staffing(s):
    dishes=[{'id':d['id'],'name':d['name'],'is_active':d['is_active'],'employee_ids':[e['id'] for e in s['employees'] if can_prepare(e,d)]} for d in s['menu']]
    skills=[]
    requirements={sk['name']:max(sk['proficiency'],max([x['proficiency'] for d2 in s['menu'] for x in d2['skills'] if x['name']==sk['name']],default=1)) for d in s['menu'] for sk in d['skills']}
    for name,level in requirements.items():
        staff=[e['name'] for e in s['employees'] if e['weekly_hours']>0 and any(sk['name']==name and sk['proficiency']>=level for sk in e['skills'])]
        skills.append({'name':name,'minimum_proficiency':level,'employees':staff,'count':len(staff)})
    return {'skills':skills,'dishes':dishes,'uncovered_dishes':[d['name'] for d in dishes if d['is_active'] and not d['employee_ids']],'single_points_of_failure':[d['name'] for d in dishes if d['is_active'] and len(d['employee_ids'])==1],'recommended_skills':[sk['name'] for sk in sorted(skills,key=lambda x:x['count']) if sk['count']<2], 'limitations':['Recorded skills indicate capability, not simultaneous shift coverage.','No workload, service capacity, or demand increase is inferred from staffing changes.']}

def hiring(s,wage=22,hours=30):
    coverage=staffing(s)
    return {**coverage,'proposed_wage':wage,'proposed_hours':hours,'weekly_added_cost':money(wage*hours),'potential_dishes':[d['name'] for d in coverage['dishes'] if not d['employee_ids']],'assumptions':['Illustrative hire: $22/hour, 30 hours/week. Revise in the simulator.','A hire does not automatically generate additional revenue.']}
