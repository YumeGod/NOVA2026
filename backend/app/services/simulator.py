from copy import deepcopy
from app.services.analytics import overview, money
from app.services.staffing import staffing

def simulate(state,scenario):
    s=deepcopy(state); p=scenario.model_dump(); kind=p['type']
    def employee():
        found=next((e for e in s['employees'] if e['id']==p['employee_id']),None)
        if found is None: raise ValueError('Employee not found')
        return found
    if kind=='hire': s['employees'].append({'id':-1,**p['employee']})
    elif kind=='remove_employee': s['employees'].remove(employee())
    elif kind=='change_hours': employee()['weekly_hours']=p['hours']
    elif kind in ('remove_dishes','change_price'):
        selected=[d for d in s['menu'] if d['id'] in p['dish_ids'] and d['is_active']]
        if len(selected)!=len(set(p['dish_ids'])): raise ValueError('Select existing active dishes')
        for d in selected:
            if kind=='remove_dishes': d['is_active']=False
            else: d['selling_price']=p['price']
    elif kind=='add_dish':
        if any(r['ingredient_id'] not in {i['id'] for i in s['ingredients']} for r in p['dish']['recipe']): raise ValueError('Unknown recipe ingredient')
        s['menu'].append({'id':-1,**p['dish']})
    before=overview(state); after=overview(s)
    old=staffing(state); new=staffing(s)
    lost=[n for n in new['uncovered_dishes'] if n not in old['uncovered_dishes']]
    def usage(snapshot):
        totals={}
        for dish in snapshot['menu']:
            if not dish['is_active']: continue
            for r in dish['recipe']:
                ident=r['ingredient_id']
                if dish['weekly_sales_volume'] is None: totals[ident]=None
                elif ident not in totals or totals[ident] is not None: totals[ident]=totals.get(ident,0)+r['quantity_required']*dish['weekly_sales_volume']
        return totals
    prior_usage=usage(state); next_usage=usage(s)
    ingredient_changes=[{'id':i['id'],'name':i['name'],'unit':i['unit'],'before':money(prior_usage.get(i['id'],0)),'after':money(next_usage.get(i['id'],0))} for i in s['ingredients'] if prior_usage.get(i['id'],0)!=next_usage.get(i['id'],0)]
    gained=[d['name'] for d in new['dishes'] if d['employee_ids'] and not next((old_d['employee_ids'] for old_d in old['dishes'] if old_d['id']==d['id']),[])]
    return {'ingredient_usage_changes':ingredient_changes,'gained_dishes':gained,'type':kind,'before':before,'after':after,'delta':{k:money(after[k]-v) if isinstance(v,(float,int)) and isinstance(after[k],(float,int)) else None for k,v in before.items() if k not in ('warnings',)},'coverage_before':old,'coverage_after':new,'lost_dishes':lost,'risks':(['Remaining staff cannot prepare: '+', '.join(lost)] if lost else [])+new['limitations'],'assumptions':['Recorded sales volumes stay constant unless a dish is added or removed.','Removed dish sales are lost; substitution and demand elasticity are unknown.','Staffing changes do not automatically remove dish sales from the financial estimate. Review lost capabilities separately.','Estimated operating result excludes unrecorded costs, taxes, debt, and owner distributions.']}
