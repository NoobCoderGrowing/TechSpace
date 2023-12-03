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
                                <p>4 months as a front-end software intern at <a href='https://www.appen.com.cn/'>Appen</a> (a machine learning data labeling service provider) and 10 months as a search engine developer (Java) at <a href='https://www.yiyaowang.com/en.html'>Yi</a> (1药网, a leading pharmaceutical e-commerce in China). Able to design and implement scalable high availability distributed data-intensive application, and undertake fullstack development and data warehousing/analysis job.</p>
                            </div>
                        </div>
        
                        <div className={`${classes.row} ${classes.profession}`}>
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Advantages</h3>
                            </div>
                            <div className={classes.right}>
                                <ul>
                                    <li>
                                        <p>Good at byte level optimization(e.g. use variable length int, long to reduce in memory numeric value index size, and FST to strings) </p>
                                    </li>
                                    <li>
                                        <p>Sensitive to computation efficience(e.g. use numeric trie to fasten numeric range search.) </p>
                                    </li>
                                    <li>
                                        <p>Good SQL writer, having taken data warehouse migration task(translate dosens of PGSQL to HiveSQL from FineBI to Ali MaxCompute, many of which are more than a hundred lines with multiple joins) and weekly search trend analysis generation (writing SQL to facilitate visulization)</p>
                                    </li>
                                    <li>
                                        <p>Have a thorough understanding of commercial vertical search engine development, of both the traditional and modern tricks, and also the architecture in industry practice.</p>
                                    </li>
                                </ul>
                            </div>
                        </div>
        
                        <div className={classes.row}>
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Skills</h3>
                            </div>
                            <div className={classes.right}>
                                <p><b>Language:</b> Java, Python, Javascript, C, Shell</p>
                                <br></br>
                                <p><b>Backend:</b> Spring Boot, Spring Cloud, Spring Security, Maven, MySql, JPA, MyBatis, LZ4, Lucene, ElasticSearch, RestTemplate, OpenFeign, Dubbo, WebFlux, Redis, MongoDB, Caffeine, Kafka, Nacos, Eureka, Apollo Config Center, jmap, jstat</p>
                                <br></br>
                                <p><b>Data Mining and Analysis:</b> HiveSql, PgSql, Weka, Spark, Pandas, MatPlot, Seaborn</p>
                                <br></br>
                                <p><b>Machine Learning and Deep Learning:</b> Pytorch, Huggingface, SkLearn, Numpy, Wandb</p>
                                <br></br>
                                <p><b>Frontend:</b> React, Typesscript, Antd, Bootstrap, Webpack, Vite</p>
                                <br></br>
                                <p><b>Image Processing:</b> OpenCV</p>
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
                                                <p className={classes.nowrap}><b>IT Support (Part Time)</b></p>
                                            </div>
                                        </div>
                                        <div><p><a href="https://oznwfabrics.com.au/">OZ Nonwoven Fabrics Limited</a></p></div>
                                        <p className={classes.workTimeline}>Brisbane, Australia, &nbsp;2023 Septermber 01 ~ present</p>
                                    </div>
                                    <ul className={classes.listContainer}>
                                        <li>Transfer company website and domain from outsource IT consultant and maintain them</li>
                                        <li>Manage corporate Office 365 global admin account</li>
                                        <li>Develop order search and management system</li>
                                    </ul>
                                    <p className={classes.leaveReason}><b>Referee:</b> </p>
                                    <p className={classes.leaveReason}>Justin Hwang (CEO)</p>
                                    <p className={classes.leaveReason}>Mobile: 0410232115</p>
                                    <p className={classes.leaveReason}>Email: justin.hwang@oznwfabrics.com.au</p>
                                </div>
        
                                <div className={classes.workHistoryContainer}>
                                    <div className={classes.timeDetailSeperator}>
                                        <div className={classes.workHistory}>
                                            <div>
                                                <p className={classes.nowrap}><b>Search engine developer</b></p>
                                            </div>
                                            <div><p><a href="https://www.yiyaowang.com/">Yi (1药网)</a></p></div>
                                        </div>
                                        <p className={classes.workTimeline}>Shanghai, China, &nbsp;2022 July 01 ~ 2023 April 13</p>
                                    </div>
                                    <ul className={classes.listContainer}>
                                        <li>Participate in developing Yi's own search engine and migrate the system from ElasticSearch</li>
                                        <li>Develop search engine backend management system for operation department</li>
                                        <li>Construct data warehouse and conduct data analysis (Weekly search keywords, top shops mining and search trend report generation) </li>
                                        <li>Optimize search system response time</li>
                                        <li>Response to online bug</li>
                                    </ul>
                                    <p className={classes.leaveReason}><b>Reason to leave:</b> This job could not provide the room to deveolop IR related NLP techniques(like vector recall and listwise ranking), which are my current study focus.</p>
                                    <p className={classes.leaveReason}><b>Referee:</b> </p>
                                    <p className={classes.leaveReason}>Jiayi Liu (Hiring Manager, Mandarin speaking)</p>
                                    <p className={classes.leaveReason}>Mobile: +86 15026529386</p>
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
                                    <p className={classes.leaveReason}><b>Referee:</b> </p>
                                    <p className={classes.leaveReason}>Grace Jin (Hiring Manager)</p>
                                    <p className={classes.leaveReason}>Mobile: +86 15800919238</p>
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
                                                <p className={classes.nowrap}><b>bird-search (SpringCloud, LGBM, Caffeine)</b></p>
                                            </div>
                                        </div>
                                        <div className={classes.workHistory}>
                                            <div><p><a href="https://mall.yaoex.com/"> Yi's pharmaceutical whosale plateform search engine</a></p></div>
                                        </div>
                                        <p className={classes.workTimeline}>Shanghai, China, &nbsp;2022 July 01 ~ 2023 April 13</p>
                                    </div>
                                    <p>bird-search is a large scale distributed commercial search engine. It consists of text correction, name entity recognition, segmentation, category prediction, inverter, indexer, recaller, strategy based ranker, fine ranker(liswise ranking) and etc. (in total 17 projects) all developed by Yi's search team. Except for weekly agile development, my main contribution to the project is beblow:</p>
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
                                    <p>Hawk is an ideal implementation of traditional vertical search engine (N-gram model and tf-idf based). It takes advantage of both bird-search, Lucene and Elasticsearch.</p>
                                    <ul className={classes.listContainer}>
                                        <li>Hawk uses nacos to regsiter different services, webflux to do asynchronous index download(pull instead of push), and supports hot index switch </li>
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
                                                <p className={classes.nowrap}><b>Tec Space</b></p>
                                            </div>
                                        </div>
                                        <p className={classes.workTimeline}>2023 Sep 22 ~ 2023 Sep 26</p>
                                    </div>
                                    <p><a href="https://wenjunblog.xyz/">Tech Space</a> is my personal website with a content editing/sharing backend system.</p>
                                    <ul className={classes.listContainer}>
                                        <li>The frontend is developed by using react + typescript, and it integrates Quil as its online editor. </li>
                                        <li>The backend uses Springboot as main framework, Spring Security to do role based authorization and MongoDB as document storage.</li>
                                    </ul>
                                    <p>Frontend code base: <a href="https://github.com/NoobCoderGrowing/TechSpace">TechSpace</a></p>
                                    <p>Backend code base: <a href="https://github.com/NoobCoderGrowing/tech-space-back">tech-space-back</a></p>
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
                                <h3 className={classes.h3}>Education</h3>
                            </div>
                            <div className={`${classes.right} ${classes.educationRight}`}>
                                <div className={classes.educationContainer}>
                                    <div className={`${classes.education}`}>
                                        <div>
                                            <p className={classes.nowrap}><b>Queensland University of Technology</b></p>
                                        </div>
                                        <div> <p className={classes.educationTimeline}>2023 Jul 24 ~ 2024 Nov 15</p></div>
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
                                <p>Large Scale Data Mining(Weka), Artificial Intelligence and Machine Learning(Pytorch, SkLearn), Image Processing & Computer Vision(OpenCV, Pytorch), Machine Learning(Python), Software engineering (Python), Advanced Software Engineering (Java), Introduction To Computer Systems(Assembly and C), Cmputer System Principles & Programming(C), Data Structures & Algorithms(Java), Dicrete Mathmatics, Calculus & Linear Algebra I, Analysis of Scientific Data(R), Stochastic Modelling, Relational Database System(MySql), Advanced Database System(Oracle), Concurrency Theory and Practice(Java), Introduction to Web Design, Human Computer Interaction</p>
                            </div>
                        </div>
        
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
                        </div>
                        <div className={classes.row}>
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
                        </div>
                        <div className={classes.row}>
                            <div className={classes.left}>
                                <h3 className={classes.h3}>Language</h3>
                            </div>
                            <div className={classes.right}>
                                <p><b>English:</b> fluent, IELTS overall 7 (Listening 7.5 Reading 7.5 Speaking 6.5 Writing 6.5 in 2018), provincial university student English speech contest 3rd place winner, with a bachelor degree in English</p>
                                <br></br>
                                <p><b>Mandarin:</b> native speaker </p>
                                <br></br>
                            </div>
                        </div>
                </div>
                <Footer/>
            </div>
            </Body>
            
        </>
    )
}

export default Resume;