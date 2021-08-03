import React from 'react'
import Questions from './Questions';

function Quiz(props) {
    
   let str=props.name.split("@");
   let s=str[0].charAt(0).toUpperCase()+str[0].substring(1);
   console.log(s);

   let a=(parseInt(Math.random()*100)%4);
   let b=parseInt((Math.random()*100)%4);
   if(a==b)
   {
       a=(a+1)%4;
   }


   console.log(a+"  "+b);
    return (
        <> 
        <div style={{display:'flex' ,flexDirection:'column'}}>
       <div> 
        <div style={{float:'left' ,marginLeft:'15px', fontSize:40 }}v> BrainWorks</div>
        <div style={{float:'right' ,marginRight:'15px', fontSize:40 }}>Logged in : {`${s}`}</div>
        </div>
        <div style={{border:'2px' ,background:'black',height:2}}></div>
        </div>
        <Questions a={a} b={b} />


       </> 
    )
}

export default Quiz
