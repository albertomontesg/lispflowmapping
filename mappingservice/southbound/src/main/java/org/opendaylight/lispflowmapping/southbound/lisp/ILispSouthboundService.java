package org.opendaylight.lispflowmapping.southbound.lisp;

import java.net.DatagramPacket;

public interface ILispSouthboundService {

    public void handlePacket(DatagramPacket packet);

}