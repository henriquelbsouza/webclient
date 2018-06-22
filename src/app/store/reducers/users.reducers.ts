// Custom Action
import { UsersActionTypes, UsersActionAll } from '../actions';

// Model
import { UserState } from '../datatypes';

export const initialState: UserState = { username: null, id: null, whiteList: [], blackList: [], contact: [] };

export function reducer(state = initialState, action: UsersActionAll): UserState {
  switch (action.type) {
    case UsersActionTypes.ACCOUNTS_READ_SUCCESS: {
      return { ...state, id: action.payload.id, username: action.payload.username };
    }
    case UsersActionTypes.WHITELIST_READ_SUCCESS: {
      return { ...state, whiteList: action.payload };
    }
    case UsersActionTypes.WHITELIST_ADD_SUCCESS: {
      return { ...state,
        whiteList: state.whiteList.concat(
          [{id: action.payload.id, name: action.payload.name, email: action.payload.email}])};
    }
    case UsersActionTypes.BLACKLIST_READ_SUCCESS: {
      return { ...state, blackList: action.payload };
    }
    case UsersActionTypes.BLACKLIST_ADD_SUCCESS: {
      return {
        ...state,
        whiteList: state.blackList.concat(
          [{ id: action.payload.id, name: action.payload.name, email: action.payload.email }])
      };
    }
    case UsersActionTypes.CONTACT_GET_SUCCESS: {
      return {...state, contact: action.payload};
    }
    case UsersActionTypes.CONTACT_ADD: {
      return {...state, inProgress: true, isError: false};
    }
    case UsersActionTypes.CONTACT_ADD_SUCCESS: {
      return { ...state, contact: state.contact.concat([action.payload]), inProgress: false, isError: false};
    }
    case UsersActionTypes.CONTACT_ADD_ERROR: {
      return {...state, inProgress: false, isError: true};
    }
    case UsersActionTypes.ACCOUNT_DETAILS_GET_SUCCESS: {
        if (action.payload.results && action.payload.results[0]) {
            return {
                ...state,
                contact: action.payload.results[0].contacts,
                blackList: action.payload.results[0].blacklist,
                whiteList: action.payload.results[0].whiteList,
                username: action.payload.results[0].username,
            };
        }
        return state;
    }
    default: {
      return state;
    }
  }
}
