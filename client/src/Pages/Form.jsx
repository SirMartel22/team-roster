import React from 'react'
import ctl from '@netlify/classnames-template-literals';
import axios from 'axios'
// import cors from 'cors'


const Form = () => {

  const inputFormStyle = ctl(`
        bg-[#f4f8f7] 
        py-1 
        px-8 
        rounded-lg 
        border 
        text-[#36454F]
        w-full
    `)
  
  const inputFormDivs = ctl(`
        flex
        flex-col
        gap-2
    `)
    
    const handleSubmit = async (e) => {
  
      e.preventDefault() // stops page reload
      
      let name = e.target.fullname.value;
      let username = e.target.username.value;
      let email = e.target.email.value;
      let phone = e.target.phone.value;
      let whatsapp = e.target.whatsapp.value;
      let subunit = e.target.subunit.value;

      
      const data = {name, username, email, phone, whatsapp, subunit}
      
      
      console.log(data);

      try {
        const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/server/server`, data);
        console.log(response.data);

        // e.target.reset();

      } catch (err){
        console.log(`${err} is preventing form submission`)
      }
    }

  return (
    <div className="flex justify-center pt-8 px-2 md:px-48">
      <div className="form-wrapper overflow-hidden rounded-xl w-full flex flex-col md:flex-row justify-center items-center">

          <div className="left-side flex flex-col justify-center items-center w-full md:w-xl md:max-w-2xl bg-[#3bb398] p-12 gap-6 h-[100%]  rounded-l-lg">
            <h1 className="text-[#fafcff] font-bold text-2xl">Welcome</h1>

            <p className=" text-center text-[#fafcff]">To start receiving update about when you're on duty, kindly register with your info</p>
            <button className="register text-[#3bb398] font-bold border rounded-xl p-2 bg-[#f5f5f5] hover:bg-[#3bb398] hover:text-[#f5fcff] w-full">Register</button>
          
          </div>

          <div className="right-side flex flex-col justify-center items-left w-full md:w-2xl md:max-w-3xl bg-[#f5f5f5] p-8 gap-6 h-full rounded-r-lg">
            <div className="form-title text-[#3eaf9c] font-bold text-2xl">
              Register Your Info
            </div>
          <form onSubmit={ handleSubmit} action='/submit' method="POST" className="flex flex-col justify-center items-left gap-2 ">
              <div className={inputFormDivs }>
                  <div className="fullname-div">
                      {/* <label for ="name" >Name </label> */}
                      <input name="fullname" type="text" className={inputFormStyle} placeholder="Name e.g 'Timmy Oyin'" />  
                  </div>


                  <div className="username-div">
                      {/* <label for ="name" >Username </label> */}
                      <input name="username"  type="text" className={inputFormStyle} placeholder="Username eg. 'SirMartel' " />  
                  </div>
              </div>
                    
              <div className={inputFormDivs}>
                  <div className="email-div">
                      {/* <label for ="name">Email Address </label> */}
                      <input name="email" type="email" className={inputFormStyle} placeholder="Email e.g 'someone@example.com'" />  
                    </div>
                    
                  <div className="phone-div">
                      {/* <label for ="name">Phone </label> */}
                      <input name="phone" type="tel" className={inputFormStyle} placeholder="Phone '0908 877 6655' "/>  
                    </div>
              </div>
              
              <div className="WhatsApp-subunit">
                  <div className="whatsapp-div">
                      {/* <label for ="name">WhatsApp Number</label> */}
                      <input name="whatsapp" type="tel" className={inputFormStyle} placeholder="WhatsApp '0908 877 6655'" />  
                  </div>
              </div>

              <div className="unit">
                  <div className="subunit">
                      {/* <label for ="name">Pick Your Unit in The Media</label> */}
                        <select name="subunit" id="" className={inputFormStyle}>
                            <option value="Content">Content </option>
                            <option value="Videography">Videography</option>
                            <option value="Photography">Photography</option>
                            <option value="Livestream">Livestream & EasyWorship</option>
                        </select>  
                    </div>
              </div>

              <button className="text-[#fafcff] mt-6 font-bold border rounded-xl p-2 bg-[#3bb398] hover:bg-[#f5f5f5] hover:text-[#3bb398]">Submit</button>
                  
            </form>
          </div>
      </div>
    </div>
  )
}


export default Form
