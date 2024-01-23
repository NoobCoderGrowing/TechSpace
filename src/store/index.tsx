import { createStore, combineReducers } from 'redux';
import {LoginState} from '../components/TypeDefinition'



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

const allReducers = combineReducers({
  articles: ArticlesReducer,
  login: LoginReducer
})

  
const store = createStore(allReducers); 


export default store;