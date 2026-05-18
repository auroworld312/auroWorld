//class for making a user
export class User{
    #username;
    #firstname;
    #lastname;
    #email;
    #role;
    constructor(username, firstname, lastname,
        email, role
    ){
        this.#username=username;
        this.#firstname=firstname;
        this.#lastname=lastname;
        this.#email=email;
        this.#role=role;
    }
    getUsername(){
        return this.#username;
    }
    getFirstname(){
        return this.#firstname;
    }
    getLastname(){
        return this.#lastname;
    }
    getEmail(){
        return this.#email;
    }
    getRole(){
        return this.#role;
    }
}