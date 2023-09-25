import Header from "../layout/Header";
import Body from "../layout/Body";
import Footer from "../layout/Footer";
import classes from './Resume.module.css'
import {useRef } from "react";
import {Link} from 'react-router-dom'


function Resume(){
    

    const modelRef = useRef<HTMLDivElement|null>(null); 

    function closeModal(){
        const modal = modelRef.current;
        if(modal) modal.style.display='None';
    }   
    return(
        <>
            <Header/>
            <Body>
            <div id="myModal" className={classes.modal} ref={modelRef}>
                <div className={classes.modalContent}>
                     <Link to={"/"}><span onClick={closeModal} className={classes.close}>&times;</span></Link>
                    
                    <div className={`${classes.row} ${classes.rowOne}`}>
                        <div className={classes.left}>
                            <h1>Wayne Yao</h1>
                        </div>
                        <div className={`${classes.contact}`}>
                            <p>Address: Robertson, Brisbane, QLD, AU</p>
                            <p>Mobile Number: +61 410837649</p>
                            <p>Email: <a href="mailto:waynejune.yao@gmail.com">waynejune.yao@gmail.com</a></p>
                            <p>Linkedin: <a href="linkedin.com/in/wayne-yao-connect">linkedin.com/in/wayne-yao-connect</a></p>
                            <p>Personal Website: <a href="https://wenjunblog.xyz/">https://wenjunblog.xyz</a></p>
                        </div>
                    </div>

                    <div className={`${classes.row} ${classes.profession}`}>
                        <div className={classes.left}>
                            <h3>Professional Summaary</h3>
                        </div>
                        <div className={classes.right}>
                            <p>4 months as a front-end software intern at <a href='https://appen.com/'>Appen</a> and 10 months as a java backend developer at <a href='https://www.yiyaowang.com/'>YI</a> (a leading pharmaceutical e-commerce in China). Able to design and implement large scale high availability complex distributed system.</p>
                        </div>
                    </div>

                    <div className={classes.row}>
                        <div className={classes.left}>
                            <h3>Skills</h3>
                        </div>
                        <div className={classes.right}>
                            <p><b>Backend:</b> SpringBoot, SpringCloud, RestTemplate, OpenFeign, Dubbo, WebFlux, MySql, Redis, Caffeine, Kafka, Nacos, Eureka, Apollo Config Center, Lucene, ElasticSearch, jmap, jstat</p>
                            <p><b>Frontend:</b> React, Typesscript, antd, bootstrap, webpack, vite</p>
                            <p><b>Machine Learning and Deep Learning:</b> sk-learn, pytorch, numpy, py-plot, wandb</p>
                            <p><b>CI&CD:</b> docker, k8s, jenkins</p>
                        </div>
                    </div>
                    <div className={classes.row}>
                        <div className={classes.left}>
                            <h3>Work History</h3>
                        </div>
                        <div className={classes.right}>
                            <div className={classes.workHistoryContainer}>
                                <div className={classes.timeDetailSeperator}>
                                    <div className={classes.workHistory}>
                                        <div>
                                            <p className={classes.nowrap}><b>Java backend developer</b></p>
                                        </div>
                                        <div><p><a href="https://www.yiyaowang.com/">YI</a></p></div>
                                    </div>
                                    <p className={classes.workTimeline}>Shanghai, China, &nbsp;2022 July 01 ~ 2023 April 13</p>
                                </div>
                                <ul className={classes.listContainer}>
                                    <li>Participate in weekly agile development</li>
                                    <li>Response to online bug</li>
                                    <li>Optmize search system efficiency</li>
                                    <li>Participate in generating search data analysis report</li>
                                </ul>
                                <p className={classes.leaveReason}><b>Reason to leave:</b> To seek a more challenging job.</p>
                            </div>

                            <div className={classes.workHistoryContainer}>
                                <div className={classes.timeDetailSeperator}>
                                    <div className={classes.workHistory}>
                                        <div>
                                            <p className={classes.nowrap}><b>Frontend software intern</b></p>
                                        </div>
                                        <div><p><a href="https://appen.com/">Appen</a></p></div>
                                    </div>
                                    <p className={classes.workTimeline}>Shanghai, China, &nbsp;2021 July 01 ~ 2021 December 01</p>
                                </div>
                                
                                <ul className={classes.listContainer}>
                                    <li>Implement frontend components according to design</li>
                                    <li>Incorporate Docsify as system manual</li>
                                    <li>Invent frontend dev tools to enhance development efficiency</li>
                                </ul>
                             </div>
                        </div>
                    </div>
                    <div className={`${classes.row} ${classes.corporate}`} >
                        <div className={classes.left}>
                            <h3>Corporate Projects</h3>
                        </div>
                        <div className={`${classes.right}`}>
                            <div className={classes.workHistoryContainer}>
                                <div className={classes.timeDetailSeperator}>
                                    <div className={classes.workHistory}>
                                        <div>
                                            <p className={classes.nowrap}><b>bird-search</b></p>
                                        </div>
                                        <div><p><a href="https://www.yiyaowang.com/">YI</a></p></div>
                                    </div>
                                    <p className={classes.workTimeline}>Shanghai, China, &nbsp;2022 July 01 ~ 2023 April 13</p>
                                </div>
                                <p>bird-search is a large scale distributed commercial search engine. It consists of segmentation, inverter, indexer, recaller, fast ranker and fine ranker all developed by YI's search team. Except for weekly agile development, my main contribution to the project is beblow:</p>
                                <ul className={classes.listContainer}>
                                    <li>Implement N-shortest-path algorithm for sgementation</li>
                                    <li>Participate in index data structure design</li>
                                    <li>Design and implement index sharding and update strategy</li>
                                </ul>
                             </div>
                            
                             <div className={classes.workHistoryContainer}>
                                <div className={classes.timeDetailSeperator}>
                                    <div className={`${classes.workHistory}`}>
                                        <div>
                                            <p className={classes.nowrap}><b>loonshots-web</b></p>
                                        </div>
                                        <div><p><a href="https://appen.com/">Appen</a></p></div>
                                    </div>
                                    <p className={classes.workTimeline}>Shanghai, China, &nbsp;2022 July 01 ~ 2023 April 13</p>
                                </div>
                                <p>loonshots-web is a Machine Learning Data Labling plateform, which offers data labling task realease, task inspection, and data labeling tools. My main contribution to the project is below</p>
                                <ul className={classes.listContainer}>
                                    <li>Implement 3rd party task release frontend pipeline</li>
                                    <li>Implement web email editor</li>
                                    <li>Invent duplicate localization entry checker</li>
                                    <li>Invent SVG picture coloring and sizing library</li>
                                </ul>
                             </div>
                        </div>
                    </div>
                    <div className={classes.row}>
                        <div className={classes.left}>
                            <h3>Personal Projects</h3>
                        </div>
                        <div className={classes.right}>
                            <div className={classes.workHistoryContainer}>
                                <div className={classes.timeDetailSeperator}>
                                    <div className={`${classes.workHistory}`}>
                                        <div>
                                            <p className={classes.nowrap}><b>Hawk</b></p>
                                        </div>
                                    </div>
                                    <p className={classes.workTimeline}>2023 Apr 14 ~ 2023 July 07</p>
                                </div>
                                <p>Hawk aims to be a firt class vertical commercial search engine. It takes advantage of both bird-search, Lucene and Elasticsearch.</p>
                                <ul className={classes.listContainer}>
                                    <li>Hawk uses nacos to regsiter different services, webflux to do asynchronous index upload </li>
                                    <li>Use variable length int, long data structure to compress numeric value in inverted index, and lz4 algorithm to compress positive index as Lucence does</li>
                                    <li>Hawk uses FST to store inverted dictionary and numeric trie to do range search as Lucene does</li>
                                    <li>Unlike bird-search, Hawk uses statiscal N-shortest-path algorithm to do segementation, which is based on statistical language model</li>
                                    <li>Unlike Elasticsearch, Hawk seperates indexer and recaller, which doesn't influence engine's performance during indexing, and offers hot index switch</li>
                                </ul>
                                <p>Code Base: <a href="https://github.com/NoobCoderGrowing/hawk">Hawk</a></p>
                            </div>
                            <div className={classes.workHistoryContainer}>
                                <div className={classes.timeDetailSeperator}>
                                    <div className={`${classes.workHistory}`}>
                                        <div>
                                            <p className={classes.nowrap}><b>oz-order</b></p>
                                        </div>
                                    </div>
                                    <p className={classes.workTimeline}>2023 Sep 18 ~ 2023 Sep 21</p>
                                </div>
                                <p>oz-order is a order search and order management system designed for <a href="https://oznwfabrics.com.au/">OZ Nonwoven Fabrics Limited.</a></p>
                                <ul className={classes.listContainer}>
                                    <li>oz-order uses react, Typesscript and antd as its front end implementation.</li>
                                    <li>oz-order uses springboot + mybatis as its backend implementation</li>
                                </ul>
                                <p>Demonstration:</p>
                                <p><a href="http://wenjunblog.xyz/">Order Search</a></p>
                                <p><a href="http://wenjunblog.xyz/order-admin">Order Management</a></p>
                                <p>Frontend code base: <a href="https://github.com/NoobCoderGrowing/oz-order-front">oz-order-front</a></p>
                                <p>Backend code base: <a href="https://github.com/NoobCoderGrowing/oz-order-back">oz-order-back</a></p>
                            </div>
                            <div className={classes.workHistoryContainer}>
                                <div className={classes.timeDetailSeperator}>
                                    <div className={`${classes.workHistory}`}>
                                        <div>
                                            <p className={classes.nowrap}><b>Meow</b></p>
                                        </div>
                                    </div>
                                    <p className={classes.workTimeline}>2023 Aug 25 ~ 2023 Aug 27</p>
                                </div>
                                <p>Meow is a chrome extension plugin that uwuify your webpages uwu. It would scrape the DOM from each webpage and change the text into uwu speak, as well as plaster cat photos over all visible images. The first version of Meow is developed during UQCS hackathon 2023.</p>
                                <ul className={classes.listContainer}>
                                    <li>Use Flask as serverside framwork and openCV to overlay cat image on the original one</li>
                                    <li>Pure JS scraper</li>
                                </ul>
                                <p><b>Note</b>: The serverside of original version is down now. For demonstration and installation, please see latest code base README.md</p>
                                <p>Latest Code Base: <a href="https://github.com/AncientMeme/uwuify">Meow</a></p>
                                <p>Original Code Base: <a href="https://github.com/NoobCoderGrowing/Meow">Meow</a></p>
                            </div>
                        </div>
                    </div>

                    <div className={classes.row}>
                        <div className={classes.left}>
                            <h3>Education</h3>
                        </div>
                        <div className={`${classes.right} ${classes.educationRight}`}>
                            <div className={classes.educationContainer}>
                                <div className={`${classes.education}`}>
                                    <div>
                                        <p className={classes.nowrap}><b>Queensland University of Technology</b></p>
                                    </div>
                                    <div> <p className={classes.educationTimeline}>2022 Jul 24 ~ 2024 Dec15</p></div>
                                </div>
                                <p>Master of Data Analytics (Statistical Data Science Major)</p>
                                <p>GPA: N/A（First Semester）</p>
                            </div>
                            <div className={classes.educationContainer}>
                                <div className={`${classes.education}`}>
                                    <div>
                                        <p className={classes.nowrap}><b>The University of Queensland</b></p>
                                    </div>
                                    <div> <p className={classes.educationTimeline}>2019 Jul 28 ~ 2022 Jun 15</p></div>
                                </div>
                                <p>Master of Information Technology</p>
                                <p>GPA: 5.44/7.00</p>
                            </div>

                            <div className={classes.educationContainer}>
                                <div className={`${classes.education}`}>
                                    <div>
                                        <p className={classes.nowrap}><b>Hefei Normal University</b></p>
                                    </div>
                                    <div> <p className={classes.educationTimeline}>2014 Sep 01 ~ 2018 Jun 30</p></div>
                                </div>
                                <p>Bachelor of English</p>
                                <p>GPA: 83.00/100.00 </p>
                            </div>

                        </div>
                    </div>

                    <div className={classes.row}>
                        <div className={classes.left}>
                            <h3>Core Finished Courses </h3>
                        </div>
                        <div className={classes.right}>
                            <p>Software engineering (Python), Advanced Software Engineering (Java), Introduction To Computer Systems, Cmputer System Principles & Programming, Dicrete Mathmatics, Calculus & Linear Algebra I, Analysis of Scientific Data, Relational Database System, Advanced Database System, Concurrency Theory and Practice, Machine Learning </p>
                        </div>
                    </div>
                </div>
            </div>
            </Body>
            <Footer/>
        </>
    )
}

export default Resume;