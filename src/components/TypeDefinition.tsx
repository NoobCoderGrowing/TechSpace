export type Article = {
    _id: string,
    title: string,
    date: string,
    content: string
}

export type Project = {
    name: string,
    url: string
}

export type State = {
    articles : Object;
}