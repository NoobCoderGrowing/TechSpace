import { createStore } from 'redux';
import {State} from '../components/TypeDefinition'


const ArticlesReducer = (state : State = { articles: {}}, action) => {
    switch (action.type) {
      case 'UPDATEARTICLES':
        state.articles = action.payload;
        return state;
      default:
        return state;
    }
  };
  
const store = createStore(ArticlesReducer); 

export default store;