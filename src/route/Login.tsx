import 'mdb-react-ui-kit/dist/css/mdb.min.css';
import "@fortawesome/fontawesome-free/css/all.min.css";
import {useNavigate} from 'react-router-dom'

import {
    MDBContainer,
    MDBInput,
    MDBCheckbox,
    MDBBtn,
    MDBIcon
  }
  from 'mdb-react-ui-kit';
import { useState, ChangeEvent } from 'react';
import {message} from 'antd';

export default function Login(){
    const [messageApi, contextHolder] = message.useMessage();
    const navigate = useNavigate();
    const [username,setUsername] = useState<string>('')
    const [password,setPassword] = useState<string>('')


    function handleUsername(e:ChangeEvent<HTMLInputElement>){
      setUsername(e.target.value)
    }

    function handlePassword(e:ChangeEvent<HTMLInputElement>){
      setPassword(e.target.value)
      
    }

    async function handleLogin(){
     
      let formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);
      let url = "https://wenjunblog.xyz:7777/login";
      await fetch(url, {
          method: 'POST',
          headers: {
              'Accept': 'application/json',
          },
          credentials: 'include',
          body: formData
      }).then(response => {
        const responseJson = response.json();
        return responseJson;
      }).then(result =>{
        if(result['login']== true){
          navigate('/edit')
        }else{
          messageApi.error("username or password wrong")
        }
      })
  }

    return(
      <MDBContainer className="p-3 my-5 d-flex flex-column w-50">
      {contextHolder}
      <MDBInput onChange={handleUsername} wrapperClass='mb-4' label='Username' id='form1' type='email'/>
      <MDBInput onChange={handlePassword} wrapperClass='mb-4' label='Password' id='form2' type='password'/>

      <div className="d-flex justify-content-between mx-3 mb-4">
        {/* <MDBCheckbox name='flexCheck' value='' id='flexCheckDefault' label='Remember me' /> */}
        {/* <a href="!#">Forgot password?</a> */}
      </div>
      
      <MDBBtn onClick={handleLogin} className="mb-4">Log in</MDBBtn>

      {/* <div className="text-center">
        <p>Not a member? <a href="#!">Register</a></p>
        <p>or sign up with:</p>

        <div className='d-flex justify-content-between mx-auto' style={{width: '40%'}}>
          <MDBBtn tag='a' color='none' className='m-1' style={{ color: '#1266f1' }}>
            <MDBIcon fab icon='facebook-f' size="sm"/>
          </MDBBtn>

          <MDBBtn tag='a' color='none' className='m-1' style={{ color: '#1266f1' }}>
            <MDBIcon fab icon='twitter' size="sm"/>
          </MDBBtn>

          <MDBBtn tag='a' color='none' className='m-1' style={{ color: '#1266f1' }}>
            <MDBIcon fab icon='google' size="sm"/>
          </MDBBtn>

          <MDBBtn tag='a' color='none' className='m-1' style={{ color: '#1266f1' }}>
            <MDBIcon fab icon='github' size="sm"/>
          </MDBBtn>

        </div>
      </div> */}

    </MDBContainer>
    )
}