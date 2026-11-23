import {createHaagvClient,createCommandOutbox,type Bootstrap} from '../../packages/client/index.js';
import {createSecureSessionStorage} from '../../packages/client/secure-storage.js';
const cache=new Map<string,string>();
const storage=createSecureSessionStorage({getItemAsync:async k=>cache.get(k)??null,setItemAsync:async(k,v)=>{cache.set(k,v);},deleteItemAsync:async k=>{cache.delete(k);},createRevision:()=>crypto.randomUUID()});
const client=createHaagvClient({origin:'https://platform.example',onBootstrap:(b:Bootstrap)=>b.data.matches});
void createCommandOutbox({storage}).flush({client,userId:'user',membershipId:'own'});
