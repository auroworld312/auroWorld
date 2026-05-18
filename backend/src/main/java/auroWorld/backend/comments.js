//class for making comment
export class CommentData{
    #username;
    #firstname;
    #lastname;
    #postId;
    #commentId;
    #comment;
    #upvote;
    #downvote;
    #createdAt;
    constructor(username, firstname, lastname, 
        postId, commentId, comment, upvote,downvote){
        this.#username=username;
        this.#firstname=firstname;
        this.#lastname=lastname;
        this.#postId=postId;
        this.#commentId=commentId;
        this.#comment=comment;
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
    getCommentId(){
        return this.#commentId;
    }
    getComment(){
        return this.#comment;
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