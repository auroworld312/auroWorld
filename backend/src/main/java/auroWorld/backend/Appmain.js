import {GoogleToken} from './googletoken.js'
import {User} from './users.js'
import {Post} from './posts.js'
import {Comment} from './comments.js'

console.log('Hello world');
//google oauth feature

const express = require("express");
const app = express();



// const GOOGLE_CLIENT_ID='134970251770-d7nviqn0qn0p0qpll7ru770kf2ntqu1h.apps.googleusercontent.com';

// export async function attemptLogin(){
//     const token = getToken();
//     if(!token){ 
//         return false;
//     }
//     return true;
// }
// export async function getToken(){
//     return localStorage.getItem("Session Token");
// }
// export async function getUserId(){
//     return localStorage.getItem("userId");
// }