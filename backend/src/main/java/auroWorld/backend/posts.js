//class for making a post
export class PostData{
    #username;
    #firstname;
    #lastname;
    #postId;
    #text;
    #upvote;
    #downvote;
    #createdAt;
    constructor(username, firstname, lastname, 
        postId, text, upvote, downvote
    ){
        this.#username=username;
        this.#firstname=firstname;
        this.#lastname=lastname;
        this.#postId=postId;
        this.#text=text;
        this.#upvote=upvote;
        this.#downvote=downvote;
        this.#createdAt=Date.now();
    }
    getUsername(){
        this.#username;
    }
    getFirstname(){
        return this.#firstname;
    }
    getLastname(){
        return this.#lastname;
    }
    getPostId(){
        return this.#postId;
    }
    gettext(){
        return this.#text;
    }
    getUpvote(){
        return this.#upvote;
    }
    getDownvote(){
        return this.#downvote;
    }
    getCreatedAt(){
        return this.#createdAt();
    }
    setDownvote(){
        this.#downvote=-1;
    }
    setUpvote(){
        this.#upvote=1;
    }
}