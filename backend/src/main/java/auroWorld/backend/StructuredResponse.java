package auroWorld.backend;

public record StructuredResponse(String mStatus, String mMessage, Object mData){

    public StructuredResponse {
        mStatus = (mStatus != null) ? mStatus : "invalid";
    }
}