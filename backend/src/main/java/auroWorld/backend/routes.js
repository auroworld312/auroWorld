//add a post/message to supabase
function insertPost(userId, subject, message){
    POST_SQL=
        "INSERT INTO messages (\"userID\", subject, message, upvote, downvote) " +
                "VALUES (?, ?, ?, 0, 0) RETURNING msg_id";
    return true;
}

