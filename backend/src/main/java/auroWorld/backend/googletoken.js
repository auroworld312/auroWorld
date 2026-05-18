
//class for google token for oauth
export class GoogleToken{

    constructor(aud, iss, email, hd, sub, given_name, family_name, email_verified){
        this.aud=aud;
        this.iss=iss;
        this.email=email;
        this.hd=hd;
        this.sub=sub;
        this.given_name=given_name;
        this.family_name=family_name;
        this.email_verified=email_verified;
    }
    getAud(){
        return this.aud;
    }
    getIss(){
        return this.iss;
    }
    getEmail(){
        return this.email;
    }
    getHd(){
        return this.hd;
    }
    getSub(){
        return this.sub;
    }
    getGivenName(){
        return this.given_name;
    }
    getFamilyName(){
        return this.family_name;
    }
    getEmailVerified(){
        return this.email_verified;
    }
}

