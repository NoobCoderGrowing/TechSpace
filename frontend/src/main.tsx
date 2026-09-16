import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import Home from './route/Home'
import './index.module.css'
import Blog from './route/Blog'
import ArticlePage from './route/ArticlePage'
import EidtPage from './components/EidtPage'
import Login from './route/Login'
import Projects from './route/Projects'
import TextPreprocessor from './components/projects/TextPreprocessor'
import { Provider } from 'react-redux';
import sotre from './store/index'
import DAG from './components/projects/DAG'


const router = createBrowserRouter([
  {path:'/', element:<Home/>, 
  children: [],},
  // {path:'/resume', element:<Resume/>, children: [],},
  {path:'/blog', element:<Blog/>, children: [],},
  // 标题段只是装饰，id 才是查询依据；:title? 可省，/blog/<id> 也能打开
  {path:'/blog/:id/:title?', element:<ArticlePage/>, children: [],},
  {path:'/edit', element:<EidtPage/>, children: [],},
  {path:'/login', element:<Login/>, children: [],},
  {path:'/projects', element:<Projects/>, children: [
    {path:'textPreprocessor', element:<TextPreprocessor/>, children: [],},
  ],},
  // {path:'/DAG', element:<DAG/>, children: [],},
  // {path:'/projects/textPreprocessor', element:<TextPreprocessor/>, children: [],}
]);




ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  <Provider store={sotre}>
    <RouterProvider  router={router}/>
  </Provider>
  // </React.StrictMode>,
)
