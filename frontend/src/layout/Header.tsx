import classes from './Header.module.css'
import {Link} from 'react-router-dom'
import {useState} from 'react'
import {Dropdown} from 'antd'
import type {MenuProps} from 'antd'
import {ExportOutlined} from '@ant-design/icons'
import ArticleSearch from '../components/ArticleSearch'

/**
 * 导航条 Projects 下拉里的四个仓库 —— 点哪个都是离开本站去 GitHub。
 *
 * 这里原来是个站内页面（/projects 那张 ProjectsTable，进去是 components/projects/
 * 里那套分词 demo）。现在站内不再有 Projects 页面，导航上这一项只做外链入口；
 * demo 代码还在仓库里，只是没挂路由（见 main.tsx 末尾那段注释）。
 *
 * 菜单项用 <a href> 而不是 onClick + window.open：这样右键"在新标签页打开"、
 * 中键、复制链接地址才是正常的浏览器行为。target="_blank" 必须配 noopener ——
 * 不带的话新页面能通过 window.opener 反过来操纵本页，理由和写法同
 * components/CommentSection.tsx 里给评论外链补的那套；这里不加 nofollow，
 * 这几个链接是本站自己要推的。
 */
const PROJECT_LINKS = [
    { name: 'Hawk',      url: 'https://github.com/NoobCoderGrowing/Hawk' },
    { name: 'Hawk-GR',   url: 'https://github.com/NoobCoderGrowing/Hawk-GR' },
    { name: 'JRegistry', url: 'https://github.com/NoobCoderGrowing/JRegistry' },
    { name: 'JFST',      url: 'https://github.com/NoobCoderGrowing/JFST' },
]

/**
 * type: 'group' 那层标题（"GitHub"）是有用的信息，不是装饰：四个名字本身看不出
 * 点下去是去 GitHub 还是本站，先给一句说明。不想要的话删掉 group 这层、
 * 直接把 children 里的 map 结果当 items 用即可。
 */
const projectItems: MenuProps['items'] = [{
    type: 'group',
    label: 'GitHub',
    children: PROJECT_LINKS.map(({name, url}) => ({
        key: url,
        label: (
            <a href={url} target="_blank" rel="noopener noreferrer">
                <span>{name}</span>
                <ExportOutlined className={classes.projectArrow}/>
            </a>
        ),
    })),
}]

function Header(){

    // 收着 open 是为了键盘：antd 只在开了菜单之后才接管方向键，而触发器是个
    // <span>，Enter / 空格不会自己变成一次 click（其它导航项都是 <Link>，天生可聚焦
    // 可回车）。不收着的话这个入口就是纯鼠标的。
    const [projectsOpen, setProjectsOpen] = useState(false)

    return(
        <header className={classes.headerContainer}>
            <div className={classes.headerLeftContainer}>

            </div>
            <div className={classes.headerRightContainer}>
                <ul className={classes.navigation}>
                    <li><Link className={classes.link} to={"/"}>Home</Link></li>
                    {/* <li><Link className={classes.link} to={"/resume"}>Resume</Link></li> */}
                    <li><Link className={classes.link} to={"/blog"}>Blog</Link></li>
                    {/* 触发器不能用 <Link>：点一下就成了站内跳转，而站内已经没有
                        Projects 页面了。中间那个 <span> 只是给 Dropdown 挂的载体
                        （它要求单个能接 ref 的子元素），类名沿用 .link，字号和颜色
                        才和 Home / Blog 对得上。菜单的样子在 .projectMenu 那一版里。 */}
                    <li>
                        <Dropdown
                            menu={{items: projectItems}}
                            trigger={['click']}
                            placement="bottom"
                            open={projectsOpen}
                            onOpenChange={setProjectsOpen}
                            rootClassName={classes.projectMenu}
                        >
                            <span
                                className={classes.link}
                                tabIndex={0}
                                role="button"
                                aria-haspopup="menu"
                                aria-expanded={projectsOpen}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        setProjectsOpen((open) => !open)
                                    }
                                }}
                            >
                                Projects
                            </span>
                        </Dropdown>
                    </li>
                </ul>
                {/* 搜索框连同它下面那块结果面板整个搬进了 ArticleSearch ——
                    面板必须挂在这个组件里，否则点面板外关闭的判定和
                    .searchContainer 的 z-index 都不好放。 */}
                <ArticleSearch/>
            </div>
        </header>
    )
}
export default Header;
