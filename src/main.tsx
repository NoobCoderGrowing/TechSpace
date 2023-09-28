import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import Home from './route/Home'
import './index.module.css'
import Resume from './route/Resume'
import Blog from './route/Blog'
import EidtPage from './components/EidtPage'


const router = createBrowserRouter([
  {path:'/', element:<Home/>, 
  children: [],},
  {path:'/resume', element:<Resume/>, children: [],},
  {path:'/blog', element:<EidtPage/>, children: [
    // {path:'/blog/create', element:<EidtPage/>, children: [],},
  ],},
  // {path:'/editor', element:<TextEditor/>, children: [],},
]);


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router}/>
  </React.StrictMode>,
)
