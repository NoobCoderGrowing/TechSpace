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
                                <h1 className={classes.h1}>Wayne Yao</h1>
                            </div>
                            <div className={`${classes.contact}`}>
                                <p>Location: Brisbane, QLD, AU</p>
                                <p>Mobile Number: +61 410837649</p>
                                <p>Email: <a href="mailto:waynejune.yao@gmail.com">waynejune.yao@gmail.com</a></p>
                                <p>Linkedin: <a href="https://www.linkedin.com/in/wayne-yao-connect">linkedin.com/in/wayne-yao-connect</a></p>
                                <p>Personal Website: <a href="https://wenjunblog.xyz/">https://wenjunblog.xyz</a></p>
                            </div>
                        </div>
        
                        <div className={`${classes.row} ${classes.profession}`}>
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Professional Summary</h3>
                            </div>
                            <div className={classes.right}>
                                <p>4 months as a software intern at <a href='https://www.appen.com.cn/'>Appen</a> (a machine learning data provider) and 1 year as a vertical search engine developer (Java) at <a href='https://www.yiyaowang.com/en.html'>Yi</a> (1药网, a leading pharmaceutical whosaler e-commerce in China). During my work at YI, I was the main contributor of YI's own search engine and the main developer and maintainer of their fine ranking service.</p>
                            </div>
                        </div>
        
                        <div className={`${classes.row} ${classes.profession}`}>
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Advantages</h3>
                            </div>
                            <div className={classes.right}>
                                <ul>
                                    <li>
                                        Good mathmatical foundation in areas of machine learning, digital signal processing and numerical optimization, and familiar with NLP task related LLMs. 
                                    </li>
                                    <li>
                                        Good at distributed system design, with hands on experience in developing high availability distributed data intensive backend system. 
                                    </li>
                                    <li>
                                        <p>Great intuion with data and good SQL writer, with extensive experience in doing data warehousing, data analysis, data visulization utilizing ODPS such as Ali Maxcompute and FineBI, and feature selection using Weka</p>
                                    </li>
                                    <li>
                                        <p>Sensitive to computation efficience and memory usage, able to design/utilize approporiate data structure/algorithm to speed up computation and save memory</p>
                                    </li>
                                </ul>
                            </div>
                        </div>
        
                        <div className={classes.row}>
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Skills</h3>
                            </div>
                            <div className={classes.right}>
                                <p><b>Language:</b> Java, Python, Javascript, C, Shell, R</p>
                                <br></br>
                                <p><b>Backend:</b> Spring Boot, Spring Cloud, Spring Security, Apache Curator, Apache Kafka,Maven, MySQL, Oracle SQL, HiveSQL, Hibernate, MyBatis, Lucene, ElasticSearch, RestTemplate, OpenFeign, Dubbo, WebFlux, Redis, MongoDB, Caffeine, Nacos, Eureka, Ctrip Apollo Config Center</p>
                                <br></br>
                                <p><b>Machine Learning and Deep Learning:</b> Scikit, Pytorch, Huggingface, Wandb</p>
                                <br></br>
                                <p><b>Frontend:</b> React, Typesscript, Redux, Bootstrap, Webpack, Rollup</p>
                                <br></br>
                                <p><b>Digital Signal Processing</b> Librosa,OpenCV</p>
                                <br></br>
                                <p><b>CI&CD:</b> Git, Docker, K8s, Jenkins, AWS, Google Cloud</p>
                            </div>
                        </div>
                        
                        <div className={classes.row}>
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Work History</h3>
                            </div>
                            <div className={classes.right}>
                            
                                <div className={classes.workHistoryContainer}>
                                    <div className={classes.timeDetailSeperator}>
                                        <div className={classes.workHistory}>
                                            <div>
                                                <p className={classes.nowrap}><b>Vertical search engine developer</b></p>
                                            </div>
                                            <div><p><a href="https://www.yiyaowang.com/">Yi (1药网)</a></p></div>
                                        </div>
                                        <p className={classes.workTimeline}>Shanghai, China, &nbsp;2022 July 01 ~ 2023 April 13</p>
                                    </div>
                                    <ul className={classes.listContainer}>
                                        <li>Train and deploy the fine ranking LambdaMart model by using LightGBM</li>
                                        <li>Dominated the design and the implementation of the searche engine index storage file format and in memory data structure. </li>
                                        <li>Design and implement the master-slave search engine recaller architecture by utilizing Apache Curator to facilitate the index updating/syncing everyday</li>
                                        <li>Developed the search engine backend management system for operation department</li>
                                        <li>Construct data warehouse and conduct data analysis and data visulization (Weekly search keywords, top shops mining and search trend report generation) by using ODPS such as Alibaba Maxcompute and fineBI </li>
                                        <li>Conduct feature selection by using Weka</li>
                                        <li>Optimize search system response time by data compression during transmission and exploiting the power of in-memory database such as Redis</li>
                                        <li>Decrease system pressure during peak time by utilizing message queue such as RabbitMQ</li>
                                        <li>Response to online bug</li>
                                    </ul>
                                    <p className={classes.leaveReason}><b>Reason to leave:</b> Manager change and limited resource and room for growth.</p>
                                </div>
        
                                <div className={classes.workHistoryContainer}>
                                    <div className={classes.timeDetailSeperator}>
                                        <div className={classes.workHistory}>
                                            <div>
                                                <p className={classes.nowrap}><b>Frontend software intern</b></p>
                                            </div>
                                            <div><p><a href="https://www.appen.com.cn/">Appen (Shanghai)</a></p></div>
                                        </div>
                                        <p className={classes.workTimeline}>Shanghai, China, &nbsp;2021 July 01 ~ 2021 November 01</p>
                                    </div>
                                    
                                    <ul className={classes.listContainer}>
                                        <li>Implement frontend components according to design</li>
                                        <li>Define system manual structure, and implement and integrates it into the system</li>
                                        <li>Invent frontend dev tools to enhance development efficiency</li>
                                    </ul>
                                    <p className={classes.leaveReason}><b>Reason to leave:</b> Career interest shift to backend development.</p>
                                </div>

                                <div className={classes.workHistoryContainer}>
                                    <div className={classes.timeDetailSeperator}>
                                        <div className={classes.workHistory}>
                                            <div>
                                                <p className={classes.nowrap}><b>IT Support (Part Time)</b></p>
                                            </div>
                                        </div>
                                        <div><p><a href="https://oznwfabrics.com.au/">OZ Nonwoven Fabrics Ltd.</a></p></div>
                                        <p className={classes.workTimeline}>Brisbane, Australia, &nbsp;2023 Septermber 01 ~ present</p>
                                    </div>
                                    <ul className={classes.listContainer}>
                                        <li>Develop and maintain company marketing website</li>
                                        <li>Manage exchange server</li>
                                        <li>Install hardware/driver/software</li>
                                        <li>Manage in office server/router/network</li>
                                        <li>Respond to onsite problems</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className={`${classes.row} ${classes.corporate}`} >
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Corporate Projects</h3>
                            </div>
                            <div className={`${classes.right}`}>
                                <div className={classes.workHistoryContainer}>
                                    <div className={classes.timeDetailSeperator}>
                                        <div className={classes.workHistory}>
                                            <div>
                                                <p className={classes.nowrap}><b>bird-search (SpringCloud, LightGBM, Caffeine )</b></p>
                                            </div>
                                        </div>
                                        <div className={classes.workHistory}>
                                            <div><p><a href="https://mall.yaoex.com/"> Yi's pharmaceutical whosale plateform search engine</a></p></div>
                                        </div>
                                        <p className={classes.workTimeline}>Shanghai, China, &nbsp;2022 July 01 ~ 2023 April 13</p>
                                    </div>
                                    <p>bird-search is a Java based large scale distributed commercial vertical search engine. It consists of text correction, name entity recognition, segmentation, category prediction, indexer, recaller, strategy based ranker, fine ranker(learning to ranking) and etc. (in total 17 projects) all developed by Yi's search team. Except for weekly agile development, my main contribution to the project is beblow:</p>
                                    <ul className={classes.listContainer}>
                                        <li>Main contributor of segmentation, indexer, recaller  and fine ranker</li>
                                        <li>Using N-shortest-path algorithm to address Chiness word segmentation problem</li>
                                        <li>Using variable length integer, FST to improve memory usage and numeric trie to speed up numeric range search </li>
                                        <li>Utilizing Apache Curator to do leader election within recaller cluster in order to facilitate the index updating between the indexer and recallers and syncing between recallers everyday</li>
                                        <li>Using Weka to do feature selection and Caffeine to store features locally </li>
                                        <li>Train and deploy LigtGBM based LambdaMart using PMML</li>
                                    </ul>
                                    </div>
                                
                                    <div className={classes.workHistoryContainer}>
                                    <div className={classes.timeDetailSeperator}>
                                        <div className={`${classes.workHistory}`}>
                                            <div>
                                                <p className={classes.nowrap}><b>loonshots-web (React, Typescript)</b></p>
                                            </div>
                                        </div>
                                        <div className={`${classes.workHistory}`}>
                                            <div><p><a href="https://www.appen.com.cn/platform-overview/">Appen's data labelling platform</a></p></div>
                                        </div>
                                        <p className={classes.workTimeline}>Shanghai, China, &nbsp;2021 July 01 ~ 2021 November 01</p>
                                    </div>
                                    <p>loonshots-web is a Machine Learning Data Labeling plateform, which integrates data labeling task realease, task inspection, and data labeling tools together. My main contribution to the project is below</p>
                                    <ul className={classes.listContainer}>
                                        <li>Implement task release frontend pipeline</li>
                                        <li>Incorporate Docsify as system manual</li>
                                        <li>Implement web email editor component</li>
                                        <li>Develop duplicate localization entry checker</li>
                                        <li>Develop SVG picture coloring and sizing library</li>
                                    </ul>
                                    </div>
                            </div>
                        </div>
                        <div className={classes.row}>
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Personal Projects</h3>
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
                                    <p>Hawk is an ideal implementation of distributed vertical search engine (N-gram model and tf-idf based). It takes advantage of both bird-search, Lucene and Elasticsearch.</p>
                                    <ul className={classes.listContainer}>
                                        <li>Just like bird-search, hawk's recaller cluster use Apache Curator to do leader election</li>
                                        <li>Hawk uses variable length int, long data structure to compress numeric value in inverted index, and lz4 algorithm to compress positive index as Lucence does</li>
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
                                                <p className={classes.nowrap}><b>Tec Space</b></p>
                                            </div>
                                        </div>
                                        <p className={classes.workTimeline}>2023 Sep 22 ~ 2023 Sep 26</p>
                                    </div>
                                    <p><a href="https://wenjunblog.xyz/">Tech Space</a> is my personal website with a content editing/sharing backend system.</p>
                                    <ul className={classes.listContainer}>
                                        <li>The frontend is developed by using react, typescript and redux, and it integrates Quil as its online editor. </li>
                                        <li>The backend uses Springboot as main framework, Spring Security to do role based authorization and MongoDB as document storage.</li>
                                    </ul>
                                    <p>Frontend code base: <a href="https://github.com/NoobCoderGrowing/TechSpace">TechSpace</a></p>
                                    <p>Backend code base: <a href="https://github.com/NoobCoderGrowing/tech-space-back">tech-space-back</a></p>
                                </div>
                            </div>
                        </div>
        
                        <div className={classes.row}>
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Education</h3>
                            </div>
                            <div className={`${classes.right} ${classes.educationRight}`}>
                                <div className={classes.educationContainer}>
                                    <div className={`${classes.education}`}>
                                        <div>
                                            <p className={classes.nowrap}><b>Queensland University of Technology</b></p>
                                        </div>
                                        <div> <p className={classes.educationTimeline}>2023 Jul 24 ~ 2024 Dec 15</p></div>
                                    </div>
                                    <p>Master of Data Analytics (Statistical Data Science Major)</p>
                                </div>
                                <div className={classes.educationContainer}>
                                    <div className={`${classes.education}`}>
                                        <div>
                                            <p className={classes.nowrap}><b>The University of Queensland</b></p>
                                        </div>
                                        <div> <p className={classes.educationTimeline}>2019 Jul 28 ~ 2022 Jun 15</p></div>
                                    </div>
                                    <p>Master of Information Technology</p>
                                </div>
        
                                <div className={classes.educationContainer}>
                                    <div className={`${classes.education}`}>
                                        <div>
                                            <p className={classes.nowrap}><b>Hefei Normal University</b></p>
                                        </div>
                                        <div> <p className={classes.educationTimeline}>2014 Sep 01 ~ 2018 Jun 30</p></div>
                                    </div>
                                    <p>Bachelor of English</p>
                                </div>
        
                            </div>
                        </div>
        
                        <div className={classes.row}>
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Core Finished Courses </h3>
                            </div>
                            <div className={classes.right}>
                                <p>Large Scale Data Mining, Artificial Intelligence and Machine Learning, Image Processing & Computer Vision(OpenCV, Pytorch), Machine Learning, Software engineering (Python), Advanced Software Engineering (Java), Introduction To Computer Systems(Assembly and C), Cmputer System Principles & Programming(C), Data Structures & Algorithms(Java), Dicrete Mathmatics, Calculus & Linear Algebra, Analysis of Scientific Data(R), Stochastic Modelling, Relational Database System(MySql), Advanced Database System(Oracle), Concurrency Theory and Practice(Java), Introduction to Web Design, Human Computer Interaction</p>
                            </div>
                        </div>

                        <div className={classes.row}>
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Extra Curriculum Courses/Books </h3>
                            </div>
                            <div className={classes.right}>
                                <p>Matrix Calculus, Algorithms for optimization, Transformers for Natural Language Processing, Embedded systems, Audio Signal Processing for Machine Learning</p>
                            </div>
                        </div>

{/*         
                        <div className={classes.row}>
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Availibilty</h3>
                            </div>
                            <div className={classes.right}>
                                <ul>
                                    <li><p>Immediately available</p></li>
                                    <li><p>Willing to relocate upon sucessful application</p></li>
                                    <li><p>Accept work from home</p></li>
                                </ul>
                            </div>
                        </div> */}
                        {/* <div className={classes.row}>
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Visa Condition</h3>
                            </div>
                            <div className={classes.right}>
                                <p><b>Current visa:</b> 500 student visa</p>
                                <br></br>
                                <p><b>Current visa work right:</b> Full time during university holiday and 24 hours/week when university semester is in seesion (Additional hours can be negotiated).</p>
                                <br></br>
                                <p><b>Future visa / path to PR:</b> Eligible for 4 years 485 graduate visa after graduation, and will seek PR via 189/190 independet-skilled visa or 186 employer nomination scheme visa </p>
                                <br></br>
                            </div>
                        </div> */}
                        {/* <div className={classes.row}>
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Language</h3>
                            </div>
                            <div className={classes.right}>
                                <p><b>English:</b> fluent, IELTS overall 7 (Listening 7.5 Reading 7.5 Speaking 6.5 Writing 6.5 in 2018), provincial university student English speech contest 3rd place winner, with a bachelor degree in English</p>
                                <br></br>
                                <p><b>Mandarin:</b> native speaker </p>
                                <br></br>
                            </div>
                        </div> */}
                </div>
                <Footer/>
            </div>
            </Body>
            
        </>
    )
}

export default Resume;