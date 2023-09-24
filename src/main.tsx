import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import Home from './route/Home'
import './index.module.css'
import Resume from './route/Resume'

const router = createBrowserRouter([
  {path:'/', element:<Home/>, 
  children: [],},
  {path:'/resume', element:<Resume/>, children: [],},
]);


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router}/>
  </React.StrictMode>,
)
