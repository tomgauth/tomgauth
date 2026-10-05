#!/usr/bin/env python3
"""Transforme les exports bruts (résultats d'outils Coda / Todoist / Calendar
enregistrés en JSON) en un snapshot compact pour le village.

Usage : python3 build_data.py <dossier_tool_results> <out.json>
Les fichiers d'entrée sont les réponses JSON de l'outil Coda `table_rows_read`
(reconnues par leurs identifiants de colonnes) plus quelques JSON annexes.
Ce script ne contient aucune donnée personnelle : il ne fait que convertir.
"""
import json, glob, os, sys, re, datetime as dt
from collections import defaultdict

SRC, OUT = sys.argv[1], sys.argv[2]
EXTRA = sys.argv[3] if len(sys.argv) > 3 else None  # dossier avec todoist.json, calendar.json, etc.

def val(v):
    if isinstance(v, dict):
        t = v.get('type')
        if t == 'dt': return v.get('input')
        if t in ('num', 'currency'): return v.get('scalar')
        if t == 'dur': return round((v.get('seconds') or 0) / 3600, 2)  # heures
        if t == 'ref': return v.get('name')
        if t == 'urlref': return v.get('url') or v.get('name')
        if t == 'slate':
            out = []
            for ch in v.get('root', {}).get('children', []):
                out.append(''.join(c.get('text', '') for c in ch.get('children', [])))
            return '\n'.join(x for x in out if x)
        if 'name' in v: return v['name']
        if 'scalar' in v: return v['scalar']
        return None
    if isinstance(v, list): return [val(x) for x in v]
    return v

def norm_date(s):
    if not s: return None
    s = str(s)
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', s)
    if m: return f"{m[1]}-{m[2]}-{m[3]}"
    m = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', s)
    if m: return f"{m[3]}-{int(m[1]):02d}-{int(m[2]):02d}"
    for fmt in ('%a, %b %d, %Y', '%b %d, %Y'):
        try: return dt.datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except Exception: pass
    return s

tables = defaultdict(list)
SIG = {
  'c-tAKEYlcGDn': 'daily', 'c-rrIg5rLq1T': 'review', 'c-NLpNVmQs_-': 'weekly',
  'c-VDUK8ZSfZW': 'predictions', 'c-zdt6gMorvZ': 'transactions', 'c-DzZH6NUIGS': 'income',
  'c-MYFiL35YQU': 'expenses', 'c-5VgMRPKecH': 'friends', 'c-Db3O5HV-wq': 'wheel',
  'c-oAKIZ4gjrk': 'kpis', 'c-4iPY-bOcL1': 'goals90', 'c-cJUTkPSKgC': 'northstar',
  'c-fE02MSJK10': 'german', 'c-c_LMqRHAQ9': 'habits',
}
for f in sorted(glob.glob(os.path.join(SRC, '*.txt')) + glob.glob(os.path.join(SRC, '*.json'))):
    try: d = json.load(open(f))
    except Exception: continue
    res = d.get('result') if isinstance(d, dict) else None
    if not res or 'rows' not in res: continue
    rows = res['rows']
    if not rows: continue
    keys = set(rows[0]['values'].keys())
    name = next((n for c, n in SIG.items() if c in keys), None)
    if not name: continue
    for r in rows:
        tables[name].append({k: val(v.get('value')) for k, v in r['values'].items()})

# dédoublonnage (même table lue plusieurs fois)
def dedupe(rows):
    seen, out = set(), []
    for r in rows:
        k = json.dumps(r, sort_keys=True, ensure_ascii=False)
        if k in seen: continue
        seen.add(k); out.append(r)
    return out
tables = {k: dedupe(v) for k, v in tables.items()}

snap = {'generated_at': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}

# ---------- Daily form ----------
D = {'c-7N0cyxEVGg':'date','c-tAKEYlcGDn':'happy','c-Od1vxNtX6T':'anx','c-SMeU0olwRC':'energy',
     'c-pW1vO6kRX6':'sleepq','c-kWTDwQNdNf':'stab','c-V60e2oSETX':'prod','c-_sD9DJt71G':'social',
     'c-JdUf0cVDmn':'clarity','c-Odae1HQlUR':'love','c-tJk_bVulpZ':'moods','c-A_xAgasvkg':'feel',
     'c-Kf1O5x9z3j':'workh','c-GAo89CsMaH':'deeph','c-3xsJzoL1hF':'calai','c-JsuqbIIW7K':'lifestyle',
     'c-QivcwogQeQ':'weather','c-3LtmknMuHq':'thi','c-aJkwhlCGNj':'tlo','c-4iFinWTuGO':'steps',
     'c-pua7ZJvXf7':'sleeph','c-3uXIVe48eE':'applesleep','c-0RW9tPoYvW':'workout','c-7C-OmoGii8':'wins',
     'c-IcUadgD3Pv':'grateful','c-rQEAz7GNN2':'where','c-x0tMPRR8u1':'dayoff','c-f2ng9VRp3c':'drinks',
     'c-BxepVjVc_n':'coffee','c-EUpJrDlBO-':'lep','c-H_1El1gT8j':'spentmonth','c-gg9GjPSZ0s':'socialev',
     'c-PllOHwlhqi':'friendstalk','c-WFYbGCMo_h':'hrv','c-1fE2ZjA9-_':'rhr','c-ikg_tCavhk':'weight',
     'c-E7OdlHIaVO':'mitdone','c-0COPDGzkfp':'formdone','c-24aqooR4WU':'somval','c-7EbioZ-ra3':'somlab'}
daily = []
for r in tables.get('daily', []):
    o = {D[k]: v for k, v in r.items() if k in D}
    o['date'] = norm_date(o.get('date'))
    for k in list(o):
        if o[k] == '' or o[k] == []: o[k] = None
    if isinstance(o.get('workout'), list): o['workout'] = ', '.join(x for x in o['workout'] if x)
    if isinstance(o.get('moods'), list): o['moods'] = [x for x in o['moods'] if x]
    daily.append(o)
daily.sort(key=lambda o: o['date'] or '')
snap['daily'] = daily

# ---------- Daily review ----------
R = {'c-X1kw0DODyR':'date','c-rrIg5rLq1T':'brief','c-NMCtOGLqFP':'wins','c-jlE8-1XUJx':'lesson',
     'c-KMbqA1umxM':'least','c-l-4F7Xm58r':'resistance','c-6Jll85DPTl':'domino','c-zaguBX0-S6':'tomorrow',
     'c-vJIy3gva4l':'score','c-tGwUW7CQCn':'parking','c-nQ2PuXbwBE':'week','c-QEHjTeiLx2':'done'}
rev = []
for r in tables.get('review', []):
    o = {R[k]: v for k, v in r.items() if k in R}; o['date'] = norm_date(o.get('date')); rev.append(o)
rev.sort(key=lambda o: o['date'] or '')
snap['reviews'] = rev[-10:]

# ---------- Weekly goals ----------
W = {'c-EkSzQV6vZC':'week','c-_jZ-KgEDfc':'start','c-v2P486YM6B':'end','c-NLpNVmQs_-':'focus',
     'c-aB8J0HP9pO':'kpi','c-RIdDkvaKK2':'domino','c-Npv2B-0DiZ':'progress','c-QAnk3V6WCJ':'exec',
     'c-JRNN04h2nd':'whynot','c-bkBof0xlYB':'resistance','c-RPdDAT09Wm':'wins','c-RdZ7Fj5bd6':'journal',
     'c-Odqq9BRq2o':'decisions','c-Kcbk029_cm':'reviewed','c-pkzAzHCNQB':'notes'}
wk = []
for r in tables.get('weekly', []):
    o = {W[k]: v for k, v in r.items() if k in W}
    o['start'] = norm_date(o.get('start')); o['end'] = norm_date(o.get('end'))
    if o.get('start'): wk.append(o)
wk.sort(key=lambda o: o['start'])
snap['weeks'] = wk

# ---------- Predictions ----------
P = {'c-VDUK8ZSfZW':'q','c-Jk-ZiXf9lg':'status','c-gtw9fM86B5':'history','c-8QLmac31K9':'due',
     'c-Dm52uGQF5u':'conf','c-oZJj1ebywF':'conf0','c-Sb_cey1uBg':'last','c-j5Htk-hBEQ':'resolved',
     'c-C6BFD1gKS9':'brier','c-w6LFpBJv5G':'acc','c-B8GOB5cm6F':'sense'}
preds = []
for r in tables.get('predictions', []):
    o = {P[k]: v for k, v in r.items() if k in P}
    o['due'] = norm_date(o.get('due')); preds.append(o)
snap['predictions'] = preds

# ---------- Transactions 2026 ----------
T = {'c-Q8SwoQ8hVb':'date','c-9Ia5zxd_Tz':'account','c-hou9Vdwur7':'payee','c-zdt6gMorvZ':'amount',
     'c-65vi3uyqTb':'dir','c-x6DDtHctQx':'sphere','c-WTS8p_OcIW':'cat','c-HjsqKkC6vO':'internal'}
tx = []
for r in tables.get('transactions', []):
    o = {T[k]: v for k, v in r.items() if k in T}
    o['date'] = norm_date(o.get('date'))
    try: o['amount'] = float(o['amount'])
    except Exception: continue
    if isinstance(o.get('payee'), dict): o['payee'] = o['payee'].get('url')
    tx.append(o)
tx.sort(key=lambda o: o['date'] or '')
monthly = defaultdict(lambda: {'in': 0, 'out': 0, 'perso_out': 0, 'solv_in': 0, 'pap_in': 0, 'solv_out': 0, 'pap_out': 0})
cats = defaultdict(float)
for o in tx:
    if o.get('internal') == 'oui' or o.get('sphere') == 'TRANSFERT': continue
    m = (o['date'] or '')[:7]
    if not m: continue
    a = o['amount']; s = o.get('sphere')
    if a > 0:
        monthly[m]['in'] += a
        if s == 'SOLV': monthly[m]['solv_in'] += a
        if s == '2PAP': monthly[m]['pap_in'] += a
    else:
        monthly[m]['out'] += -a
        if s == 'PERSO':
            monthly[m]['perso_out'] += -a
            if m >= '2026-08': cats[o.get('cat') or 'Autre'] += -a
        if s == 'SOLV': monthly[m]['solv_out'] += -a
        if s == '2PAP': monthly[m]['pap_out'] += -a
snap['money'] = {
    'monthly': {m: {k: round(v, 2) for k, v in d.items()} for m, d in sorted(monthly.items())},
    'perso_cats_since_aug': sorted([[k, round(v, 2)] for k, v in cats.items()], key=lambda x: -x[1])[:12],
    'recent': [o for o in tx if (o['date'] or '') >= '2026-09-01' and o.get('internal') != 'oui'][-80:],
    'n_tx': len(tx),
}

# ---------- Income ledger (2PaP / FRE) ----------
I = {'c-l515KKPFqZ':'date','c-DzZH6NUIGS':'amount','c-I6LljtUYeE':'source','c-E5qYJeMPVW':'client','c-Qh59ytyd0m':'nature'}
inc = []
for r in tables.get('income', []):
    o = {I[k]: v for k, v in r.items() if k in I}; o['date'] = norm_date(o.get('date'))
    try: o['amount'] = float(o['amount'])
    except Exception: continue
    inc.append(o)
inc.sort(key=lambda o: o['date'] or '')
snap['income'] = inc

# ---------- Expenses (Coda Daily Expenses) ----------
E = {'c-jWvKX4b52A':'name','c-4DEyy5d3g4':'date','c-MYFiL35YQU':'amount','c-nDHBqi7xR3':'cat','c-bCAJVQLxPG':'type','c-ppJZbus7-J':'eff'}
exp = []
for r in tables.get('expenses', []):
    o = {E[k]: v for k, v in r.items() if k in E}; o['date'] = norm_date(o.get('date'))
    try: o['amount'] = float(o['eff'] if o.get('eff') not in (None, '') else o['amount'])
    except Exception: continue
    exp.append(o)
exp.sort(key=lambda o: o['date'] or '')
snap['expenses'] = exp[-60:]

# ---------- Friends ----------
F = {'c-5VgMRPKecH':'name','c-PIWmcDqtW9':'where','c-dG2ISX8GJw':'couple','c-4jQ9AWQ1J7':'channel',
     'c-pfGi6dfovz':'last','c-WYfiquUupc':'lastctx','c-MVOKBlKoce':'life','c-Bbdm-L0hcm':'means',
     'c-NfWxB6boln':'next','c-c2ddAm1kKs':'level','c-aac6j0-MG-':'freq','c-JcnKREpY4Z':'kind'}
fr = []
for r in tables.get('friends', []):
    o = {F[k]: v for k, v in r.items() if k in F}; o['last'] = norm_date(o.get('last'))
    if isinstance(o.get('channel'), list): o['channel'] = ', '.join(x for x in o['channel'] if x)
    fr.append(o)
snap['friends'] = fr

# ---------- Wheel of life ----------
Wh = {'c-oYjMeyOsF_':'date','c-Db3O5HV-wq':'health','c-ogKur42Igu':'career','c-LuPds1BAQh':'finances',
      'c-PQ6NOkerF3':'family','c-HLR75HUqBa':'love','c-Ey6Jxc9MLm':'social','c-Krd58vooS5':'fun',
      'c-bebUWK5ufv':'giving','c-HvlDiDkTrn':'mental'}
wh = []
for r in tables.get('wheel', []):
    o = {Wh[k]: v for k, v in r.items() if k in Wh}; o['date'] = norm_date(o.get('date')); wh.append(o)
wh.sort(key=lambda o: o['date'] or '')
snap['wheel'] = wh

# ---------- KPIs / Goals / North star ----------
K = {'c-oAKIZ4gjrk':'kpi','c-rGYaEpWojh':'type','c-Sp2nNT4Jre':'def','c-We36hlR4OQ':'source','c-D5gTocnol6':'baseline','c-v-SJT-eg0k':'target','c-juYs210q_P':'period'}
snap['kpis'] = [{K[k]: v for k, v in r.items() if k in K} for r in tables.get('kpis', [])]
G = {'c-4iPY-bOcL1':'goal','c-L2youpLglr':'cat','c-4PV4mV5-PT':'baseline','c--w0Z_OatKB':'target','c-yQBPzET5Yx':'due','c-Y5KLEAklgn':'criteria','c-IERenHcZuy':'prio','c-wZsiaztnMS':'conf','c-HbyNJqXGBm':'period','c-BgdDwLXl_8':'ns'}
g = []
for r in tables.get('goals90', []):
    o = {G[k]: v for k, v in r.items() if k in G}; o['due'] = norm_date(o.get('due')); g.append(o)
snap['goals90'] = g
N = {'c-cJUTkPSKgC':'quarter','c-mkhdVUcW4R':'start','c-wYaRen88TA':'end','c-FWCflGb_Oh':'theme','c-1E2s5nL5zC':'win','c-c8SR2YTda8':'opportunity','c-cNvoNUzOKP':'nottodo','c-waUBGUvQrl':'constraints'}
ns = []
for r in tables.get('northstar', []):
    o = {N[k]: v for k, v in r.items() if k in N}; o['start'] = norm_date(o.get('start')); o['end'] = norm_date(o.get('end')); ns.append(o)
snap['northstar'] = ns

# ---------- German ----------
Ge = {'c-pfSRa1Jfg4':'date','c-vgv79m89ZP':'min','c-fsLNcuPN8V':'format','c-xS2HXJARTn':'source','c-kTwx4mbZ0A':'level',
      'c-iQOxfwOWxD':'fluency','c-Bz7j60T2MV':'richness','c-dIhAp8NHXj':'comprehension','c-QHe7VpOMUm':'communication','c-YPjaJFFCaB':'pure','c-SpkAzbhsRz':'stuck'}
ge = []
for r in tables.get('german', []):
    o = {Ge[k]: v for k, v in r.items() if k in Ge}; o['date'] = norm_date(o.get('date')); ge.append(o)
ge.sort(key=lambda o: o['date'] or '')
snap['german'] = ge

# ---------- Habits ----------
H = {'c-c_LMqRHAQ9':'name','c-JkyL9BigRG':'cat','c-p8bAztHoji':'active','c-kILx1Oftgj':'goal'}
hb = []
for r in tables.get('habits', []):
    o = {H[k]: v for k, v in r.items() if k in H}
    if isinstance(o.get('cat'), list): o['cat'] = ', '.join(x for x in o['cat'] if x)
    hb.append(o)
snap['habits'] = hb

# ---------- Extras (todoist / calendar / weather / balances) ----------
if EXTRA:
    for name in ('todoist', 'calendar', 'weather', 'balances', 'productivity', 'kpi_live'):
        p = os.path.join(EXTRA, name + '.json')
        if os.path.exists(p):
            try: snap[name] = json.load(open(p))
            except Exception as e: print('skip', name, e)

json.dump(snap, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
print('tables:', {k: len(v) for k, v in tables.items()})
print('wrote', OUT, os.path.getsize(OUT), 'bytes')
