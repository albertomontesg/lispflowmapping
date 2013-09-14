package org.opendaylight.lispflowmapping.type.lisp.address;

import org.opendaylight.lispflowmapping.type.AddressFamilyNumberEnum;

public class LispDistinguishedNameAddress extends LispAddress {

    private String distinguishedName;

    public LispDistinguishedNameAddress(String distinguishedName) {
        super(AddressFamilyNumberEnum.DISTINGUISHED_NAME);
        this.distinguishedName = distinguishedName;
    }

    public String getDistinguishedName() {
        return distinguishedName;
    }

    public void setDistinguishedName(String distinguishedName) {
        this.distinguishedName = distinguishedName;
    }

    @Override
    public int hashCode() {
        final int prime = 31;
        int result = super.hashCode();
        result = prime * result + ((distinguishedName == null) ? 0 : distinguishedName.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (!super.equals(obj))
            return false;
        if (getClass() != obj.getClass())
            return false;
        LispDistinguishedNameAddress other = (LispDistinguishedNameAddress) obj;
        if (distinguishedName == null) {
            if (other.distinguishedName != null)
                return false;
        } else if (!distinguishedName.equals(other.distinguishedName))
            return false;
        return true;
    }

}
