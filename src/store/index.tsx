import { createStore, combineReducers } from 'redux';
import {LikesState, LoginState, VisibleState} from '../components/TypeDefinition'


const ArticlesReducer = (state : Object = {}, action) => {
    switch (action.type) {
      case 'UPDATEARTICLES':
        state = action.payload;
        return state;
      default:
        return state;
    }
};

const LoginReducer = (state: LoginState = {ownerLogin: false}, action) => {
  switch(action.type){
    case 'OWNERLOGIN':
      state.ownerLogin = true;
      return state;
    case 'OWNERLOGOUT':
      state.ownerLogin = false;
      return state;
    default:
      return state;
  }
}

const LikesReducer = (state : LikesState = {homeLikes: 0}, action) => {
  switch (action.type) {
    case 'GETHOMELIKES':
      state.homeLikes = action.payload;
      return state;
    case 'INCHOMELIKES':
      state.homeLikes = action.payload;
      return state;
    default:
      return state;
  }
};

const VisibleReducer = (state : VisibleState = {projectTableV: true}, action) => {
  switch (action.type) {
    case 'SHOWPROJECTT':
      state.projectTableV = true;
      return state;
    case 'HIDEPROJECTT':
      state.projectTableV = false;
      return state;
    default:
      return state;
  }
};

const allReducers = combineReducers({
  articles: ArticlesReducer,
  login: LoginReducer,
  likes: LikesReducer,
  visible: VisibleReducer 
})

  
const store = createStore(allReducers); 


export default store;