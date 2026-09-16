export type Article = {
    _id: string,
    title: string,
    date: string,
    content: string,
    category: string
}

export type Project = {
    name: string,
    url: string
}

export type LoginState = {
    ownerLogin: boolean;
}

export type LikesState = {
    homeLikes: number;
}

export type VisibleState = {
    projectTableV: boolean;
}

export type State = {
    articles: Object,
    login: LoginState
    likes: LikesState
}




