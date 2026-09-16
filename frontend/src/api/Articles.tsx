function retriveArticles(){

    const baseURL:string = import.meta.env.VITE_BASE_URL
    let url = baseURL + "public/retrieve/articleMap"  
    
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