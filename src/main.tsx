import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import Home from './route/Home'
import './index.module.css'
import Resume from './route/Resume'
import Blog from './route/Blog'
import EidtPage from './components/EidtPage'
import Login from './route/Login'
import Projects from './route/Projects'
import TextPreprocessor from './components/projects/TextPreprocessor'
import ProjectsDefault from './components/projects/ProjectsDefault'



const router = createBrowserRouter([
  {path:'/', element:<Home/>, 
  children: [],},
  {path:'/resume', element:<Resume/>, children: [],},
  {path:'/blog', element:<Blog/>, children: [],},
  {path:'/edit', element:<EidtPage/>, children: [],},
  {path:'/login', element:<Login/>, children: [],},
  {path:'/projects', element:<Projects/>, children: [
    {path:'', element:<ProjectsDefault/>, children: [],},
    {path:'textPreprocessor', element:<TextPreprocessor/>, children: [],},
  ],},
]);


ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  <RouterProvider router={router}/>
  // </React.StrictMode>,
)
