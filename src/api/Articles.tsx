function retriveArticles(){
     let url = "https://wenjunblog.xyz:7777/public/retrieve/articles";
    return fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    }).then(response => response.json());
}

export default retriveArticles;