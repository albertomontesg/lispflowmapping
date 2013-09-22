package org.opendaylight.lispflowmapping.implementation.authentication;


public enum LispKeyIDEnum {
	NONE(0, null), //
    SHA1(1, "HmacSHA1"), //
    SHA256(2, "HmacSHA256"), //
    UNKNOWN(-1, null);
	
	private short keyID;
    private String authenticationName;

    private LispKeyIDEnum(int keyID, String authenticationName) {
        this.keyID = (short) keyID;
        this.authenticationName = authenticationName;
    }

    public String getAuthenticationName() {
        return authenticationName;
    }

    public short getKeyID() {
        return keyID;
    }

    public static LispKeyIDEnum valueOf(short keyID) {
        for (LispKeyIDEnum val : values()) {
            if (val.getKeyID() == keyID) {
                return val;
            }
        }
        return UNKNOWN;
    }
}