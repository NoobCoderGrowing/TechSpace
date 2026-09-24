import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import Home from './route/Home'
import './index.module.css'
import Blog from './route/Blog'
import ArticlePage from './route/ArticlePage'
import EidtPage from './components/EidtPage'
import Login from './route/Login'
import { Provider } from 'react-redux';
import sotre from './store/index'


const router = createBrowserRouter([
  {path:'/', element:<Home/>, 
  children: [],},
  // {path:'/resume', element:<Resume/>, children: [],},
  {path:'/blog', element:<Blog/>, children: [],},
  // 标题段只是装饰，id 才是查询依据；:title? 可省，/blog/<id> 也能打开
  {path:'/blog/:id/:title?', element:<ArticlePage/>, children: [],},
  // /edit 是新建（Login 成功后跳的是它），/edit/:id 是编辑已有文章。
  // 两条都指向 EidtPage，它按有没有 id 决定往哪个接口提交。
  {path:'/edit', element:<EidtPage/>, children: [],},
  {path:'/edit/:id', element:<EidtPage/>, children: [],},
  {path:'/login', element:<Login/>, children: [],},
]);

// 分词 demo（components/projects/）**故意不接线**。
//
// 原来它挂在 /projects/textPreprocessor：导航条上 Projects 指向站内那张
// ProjectsTable，从表里点进 demo。现在导航上那一项改成了 GitHub 外链的下拉，
// 站内不再有 Projects 页面 —— ProjectsTable / ProjectEntry 和 /projects 这条路由
// 一起删了，**但 demo 代码原样留着**（和被注释掉的 /resume、留在仓库里没入口的
// route/Resume.tsx 是同一个状态）。
//
// 想挂回来，两处一起加，别只加一处：
//   ① 文件头 import TextPreprocessor from './components/projects/TextPreprocessor'
//   ② 路由 {path:'/textPreprocessor', element:<TextPreprocessor/>, children: [],},
// 另外 demo 里还在 dispatch HIDEPROJECTT（TextPreprocessor.tsx 的 useEffect，原来是
// "进了 demo 就把那张表藏起来"），store 里那套 visible 切片是跟着它留的，别顺手删。




ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  <Provider store={sotre}>
    <RouterProvider  router={router}/>
  </Provider>
  // </React.StrictMode>,
)
