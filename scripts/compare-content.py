from html.parser import HTMLParser
import re,sys,json
class Text(HTMLParser):
 def __init__(self):super().__init__();self.skip=0;self.main=False;self.parts=[]
 def handle_starttag(self,t,a):
  if t in ('script','style'):self.skip+=1
  if t=='main':self.main=True
 def handle_endtag(self,t):
  if t in ('script','style'):self.skip=max(0,self.skip-1)
  if t=='main':self.main=False
 def handle_data(self,s):
  if self.main and not self.skip:self.parts.append(s)
def tokens(p):
 x=Text();x.feed(open(p).read());return re.findall(r'\w+',' '.join(x.parts).lower())
def compare(a,b):
 x,y=tokens(a),tokens(b);sx={tuple(x[i:i+5]) for i in range(len(x)-4)};sy={tuple(y[i:i+5]) for i in range(len(y)-4)}
 return {'words_zalla':len(x),'words_rapid':len(y),'shared_5grams':len(sx&sy),'zalla_5grams':len(sx),'zalla_shared_pct':round(100*len(sx&sy)/len(sx),2),'jaccard_pct':round(100*len(sx&sy)/len(sx|sy),2)}
if __name__=='__main__':print(json.dumps(compare(*sys.argv[1:]),ensure_ascii=False))
