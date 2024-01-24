function retriveArticles(){
    // let url = "http://localhost:7777/public/retrieve/articleMap";
     let url = "https://wenjunblog.xyz:7777/public/retrieve/articleMap";
    return fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    }).then(response => response.json()).then(result=>{
        return result;
    });
}

export default retriveArticles;