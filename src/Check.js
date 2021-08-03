import React, { useEffect, useState } from 'react'
import { database } from './firebase';
import { Button } from 'reactstrap'
import Quiz from './Quiz';
import { useAlert } from 'react-alert';

function Check() {
    const alert = useAlert()
    const [arr, setArr] = useState([]);
    const [value, SetValue] = useState('');
    const [pres, setPres] = useState(true);
    //const [alert,setAlert]=useState(false);


    useEffect(() => {
        database.Emails.onSnapshot(querySnapshot => {
            querySnapshot.forEach((doc, idx) => {
                let da = doc.data().mails;
                setArr(da);
            })
        })

    }, [])

    const handleEmail = () => {

        let flag = false;
        arr.map((mail) => {

            if (mail == value) {
                flag = true;
            }

        })

        setPres(flag);

    }


    return (
        <>
            {!pres ?
                <div className="container" style={{ marginTop: '150px', display: 'flex', flexDirection: 'column', textAlign: 'center', alignContent: 'center', justifyContent: "space-evenly" }}>
                    <h1>Let us understand your code expertise!</h1>
                    <p>Please Enter your email address</p>
                    <form align="center">
                        <input type="text" value={value} onChange={(e) => { SetValue(e.target.value) }} />
                        <br /><br />
                        <Button color='primary' onClick={() => {

                            let flag = false;
                            arr.map((mail) => {

                                if (mail == value) {
                                    flag = true;
                                }
                            })
                            if (!flag)
                                alert.show("Email address does not exist")
                            setPres(flag);

                        }}> Continue </Button>
                    </form>
                </div> : <Quiz  name={value}/>
            }
        </>
    )
}

export default Check
