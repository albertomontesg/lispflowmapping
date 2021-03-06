/*
 * Copyright (c) 2014 Contextream, Inc. and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */

package org.opendaylight.lispflowmapping.implementation.mapcache;

import java.util.Date;
import java.util.Map;

import org.opendaylight.lispflowmapping.interfaces.dao.ILispDAO;
import org.opendaylight.lispflowmapping.interfaces.dao.IRowVisitor;
import org.opendaylight.lispflowmapping.interfaces.dao.MappingEntry;
import org.opendaylight.lispflowmapping.interfaces.dao.SubKeys;
import org.opendaylight.lispflowmapping.interfaces.mapcache.IMapCache;
import org.opendaylight.lispflowmapping.lisp.util.MaskUtil;
import org.opendaylight.lispflowmapping.lisp.util.SourceDestKeyHelper;
import org.opendaylight.yang.gen.v1.urn.ietf.params.xml.ns.yang.ietf.lisp.address.types.rev151105.lisp.address.address.SourceDestKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.lfm.lisp.proto.rev151105.eid.container.Eid;
import org.opendaylight.yang.gen.v1.urn.opendaylight.lfm.mappingservice.rev150906.mapping.authkey.container.MappingAuthkey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Multi table map-cache that works with 'simple' and SourceDest LCAF addresses (see lisp-proto.yang). It can do longest
 * prefix matching for IP and SourceDest LCAF addresses. In case of the latter, it uses two tables, one for dst and
 * another for source, queried and populated in this exact order.
 *
 * @author Florin Coras
 *
 */
public class MultiTableMapCache implements IMapCache {
    private static final Logger LOG = LoggerFactory.getLogger(MultiTableMapCache.class);
    private ILispDAO dao;

    public MultiTableMapCache(ILispDAO dao) {
        this.dao = dao;
    }

    private ILispDAO getVniTable(Eid eid) {
        long vni = 0;
        if (eid.getVirtualNetworkId() == null) {
            vni = 0;
        } else {
            vni = eid.getVirtualNetworkId().getValue();
        }
        return (ILispDAO) dao.getSpecific(vni, SubKeys.VNI);
    }

    private ILispDAO getOrInstantiateVniTable(Eid eid) {
        long vni = 0;
        if (eid.getVirtualNetworkId() == null) {
            vni = 0;
        } else {
            vni = eid.getVirtualNetworkId().getValue();
        }
        ILispDAO table = (ILispDAO) dao.getSpecific(vni, SubKeys.VNI);
        if (table == null) {
            table = dao.putNestedTable(vni, SubKeys.VNI);
        }
        return table;
    }

    public void addMapping(Eid key, Object value, boolean shouldOverwrite) {
        Eid eid = MaskUtil.normalize(key);
        ILispDAO table = getOrInstantiateVniTable(key);

        if (eid.getAddress() instanceof SourceDestKey) {
            Eid srcKey = SourceDestKeyHelper.getSrc(eid);
            ILispDAO srcDstDao = getOrInstantiateSDInnerDao(eid, table);
            srcDstDao.put(srcKey, new MappingEntry<>(SubKeys.REGDATE, new Date(System.currentTimeMillis())));
            srcDstDao.put(srcKey, new MappingEntry<>(SubKeys.RECORD, value));
        } else {
            table.put(eid, new MappingEntry<>(SubKeys.REGDATE, new Date(System.currentTimeMillis())));
            table.put(eid, new MappingEntry<>(SubKeys.RECORD, value));
        }
    }

    // Method returns the DAO entry (hash) corresponding to either the longest prefix match of eid, if eid is maskable,
    // or the exact match otherwise. eid must be a 'simple' address
    private Map<String, ?> getDaoEntryBest(Eid eid, ILispDAO dao) {
        Eid key;
        if (MaskUtil.isMaskable(eid.getAddress())) {
            short mask = MaskUtil.getMaskForAddress(eid.getAddress());
            while (mask > 0) {
                key = MaskUtil.normalize(eid, mask);
                mask--;
                Map<String, ?> entry = dao.get(key);
                if (entry != null) {
                    return entry;
                }
            }
            return null;
        } else {
            key = MaskUtil.normalize(eid);
            Map<String, ?> entry = dao.get(key);
            return entry;
        }
    }

    private Object getMappingExactSD(Eid srcEid, Eid dstEid, ILispDAO dao) {
        Map<String, ?> daoEntry = dao.get(dstEid);
        if (daoEntry != null) {
            // try SrcDst eid lookup
            ILispDAO srcDstDao = (ILispDAO) daoEntry.get(SubKeys.LCAF_SRCDST);
            if (srcEid != null && srcDstDao != null) {
                return srcDstDao.getSpecific(srcEid, SubKeys.RECORD);
            }
            // if lookup fails, return whatever is found for dst eid
            return daoEntry.get(SubKeys.RECORD);
        }
        return null;
    }

    // Returns the mapping corresponding to the longest prefix match for eid.
    // eid must be a simple (maskable or not) address
    private Object getMappingLpmEid(Eid eid, ILispDAO dao) {
        if (eid == null) {
            return null;
        }
        Eid key = MaskUtil.normalize(eid);
        Map<String, ?> daoEntry = getDaoEntryBest(key, dao);
        if (daoEntry != null) {
            return daoEntry.get(SubKeys.RECORD);
        } else {
            return null;
        }
    }

    // Returns a mapping corresponding to either the longest prefix match for both dstEid and srcEid,
    // if a SourceDest mapping exists, or to dstEid
    private Object getMappingLpmSD(Eid srcEid, Eid dstEid, ILispDAO dao) {
        Map<String, ?> daoEntry = getDaoEntryBest(dstEid, dao);
        if (daoEntry != null) {
            // try SrcDst eid lookup
            ILispDAO srcDstDao = (ILispDAO) daoEntry.get(SubKeys.LCAF_SRCDST);
            if (srcDstDao != null) {
                Object mapping = getMappingLpmEid(srcEid, srcDstDao);
                if (mapping!= null) {
                    return mapping;
                }
            }

            // if lookup fails, return whatever is found for dst eid
            return daoEntry.get(SubKeys.RECORD);
        }
        return null;
    }

    public Object getMapping(Eid srcEid, Eid dstEid) {
        if (dstEid == null) {
            return null;
        }

        ILispDAO table = getVniTable(dstEid);
        if (table == null) {
            return null;
        }

        // a map-request for an actual SrcDst LCAF, ignore src eid
        if (dstEid.getAddress() instanceof SourceDestKey) {
            Eid srcAddr = SourceDestKeyHelper.getSrc(dstEid);
            Eid dstAddr = SourceDestKeyHelper.getDst(dstEid);
            return getMappingLpmSD(srcAddr, dstAddr, table);
        }

        // potential map-request for SrcDst LCAF from non SrcDst capable devices
        return getMappingLpmSD(srcEid, dstEid, table);
    }

    public void removeMapping(Eid eid, boolean overwrite) {
        Eid key = MaskUtil.normalize(eid);
        ILispDAO table = getVniTable(key);
        if (table == null) {
            return;
        }

        if (key.getAddress() instanceof SourceDestKey) {
            ILispDAO db = getSDInnerDao(key, table);
            if (db != null) {
                db.removeSpecific(SourceDestKeyHelper.getSrc(key),
                        SubKeys.RECORD);
            }
        } else {
            table.removeSpecific(key, SubKeys.RECORD);
        }
    }

    public void addAuthenticationKey(Eid eid, MappingAuthkey authKey) {
        Eid key = MaskUtil.normalize(eid);
        ILispDAO table = getOrInstantiateVniTable(key);

        if (key.getAddress() instanceof SourceDestKey) {
            ILispDAO srcDstDao = getOrInstantiateSDInnerDao(key, table);
            srcDstDao.put(SourceDestKeyHelper.getSrc(key), new MappingEntry<>(SubKeys.AUTH_KEY, authKey));
        } else {
            table.put(key, new MappingEntry<>(SubKeys.AUTH_KEY, authKey));
        }
    }

    private MappingAuthkey getAuthKeyLpm(Eid prefix, ILispDAO db) {
        short maskLength = MaskUtil.getMaskForAddress(prefix.getAddress());
        while (maskLength >= 0) {
            Eid key = MaskUtil.normalize(prefix, maskLength);
            Object password = db.getSpecific(key, SubKeys.AUTH_KEY);
            if (password != null && password instanceof MappingAuthkey) {
                return (MappingAuthkey) password;
            }
            maskLength -= 1;
        }
        return null;
    }

    public MappingAuthkey getAuthenticationKey(Eid eid) {
        ILispDAO table = getVniTable(eid);
        if (table == null) {
            return null;
        }

        if (MaskUtil.isMaskable(eid.getAddress())) {
            if (eid.getAddress() instanceof SourceDestKey) {
                // NOTE: this is an exact match, not a longest prefix match
                ILispDAO srcDstDao = getSDInnerDao(eid, table);
                if (srcDstDao != null) {
                    return getAuthKeyLpm(SourceDestKeyHelper.getSrc(eid), srcDstDao);
                }
                return null;
            } else {
                return getAuthKeyLpm(eid, table);
            }
        } else {
            Eid key = MaskUtil.normalize(eid);
            Object password = table.getSpecific(key, SubKeys.AUTH_KEY);
            if (password != null && password instanceof MappingAuthkey) {
                return (MappingAuthkey) password;
            } else {
                LOG.warn("Failed to find password!");
                return null;
            }
        }
    }

    public void removeAuthenticationKey(Eid eid) {
        Eid key = MaskUtil.normalize(eid);
        ILispDAO table = getVniTable(key);
        if (table == null) {
            return;
        }

        if (key.getAddress() instanceof SourceDestKey) {
            ILispDAO srcDstDao = getSDInnerDao(key, table);
            if (srcDstDao != null) {
                srcDstDao.removeSpecific(key, SubKeys.AUTH_KEY);
            }
        } else {
            table.removeSpecific(key, SubKeys.AUTH_KEY);
        }
    }

    // SrcDst LCAFs are stored in a 2-tier DAO with dst having priority over src.
    // This method returns the DAO associated to a dst or creates it if it doesn't exist.
    private ILispDAO getOrInstantiateSDInnerDao(Eid address, ILispDAO dao) {
        Eid dstKey = SourceDestKeyHelper.getDst(address);
        ILispDAO srcDstDao = (ILispDAO) dao.getSpecific(dstKey, SubKeys.LCAF_SRCDST);
        if (srcDstDao == null) {
            // inserts nested table for source
            srcDstDao = dao.putNestedTable(dstKey, SubKeys.LCAF_SRCDST);
        }
        return srcDstDao;
    }

    // SrcDst LCAFs are stored in a 2-tier DAO with dst having priority over src.
    // This method returns the DAO associated to dst or null if it doesn't exist.
    private ILispDAO getSDInnerDao(Eid address, ILispDAO dao) {
        return (ILispDAO) dao.getSpecific(SourceDestKeyHelper.getDst(address), SubKeys.LCAF_SRCDST);
    }

    public String printMappings() {
        final StringBuffer sb = new StringBuffer();
        sb.append("Keys\tValues\n");
        final IRowVisitor innerVisitor = (new IRowVisitor() {
            String lastKey = "";

            public void visitRow(Object keyId, String valueKey, Object value) {
                String key = keyId.getClass().getSimpleName() + "#" + keyId;
                if (!lastKey.equals(key)) {
                    sb.append("\n" + key + "\t");
                }
                sb.append(valueKey + "=" + value + "\t");
                lastKey = key;
            }
        });
        final IRowVisitor vniVisitor = (new IRowVisitor() {
            String lastKey = "";

            public void visitRow(Object keyId, String valueKey, Object value) {
                String key = keyId.getClass().getSimpleName() + "#" + keyId;
                if (!lastKey.equals(key)) {
                    sb.append(key + "\t");
                }
                if ((valueKey.equals(SubKeys.LCAF_SRCDST))) {
                    sb.append(valueKey + "= { ");
                    ((ILispDAO)value).getAll(innerVisitor);
                    sb.append("}\t");
                } else {
                    sb.append(valueKey + "=" + value + "\t");
                }
                lastKey = key;
            }
        });
        dao.getAll(new IRowVisitor() {
            String lastKey = "";

            public void visitRow(Object keyId, String valueKey, Object value) {
                String key = keyId.getClass().getSimpleName() + "#" + keyId;
                if (!lastKey.equals(key)) {
                    sb.append("\n" + key + "\t");
                }
                if (valueKey.equals(SubKeys.VNI)) {
                    sb.append(valueKey + "= { ");
                    ((ILispDAO)value).getAll(vniVisitor);
                    sb.append("}\t");
                } else {
                    sb.append(valueKey + "=" + value + "\t");
                }
                lastKey = key;
            }
        });
        sb.append("\n");
        return sb.toString();
    }

    @Override
    public void updateMappingRegistration(Eid key) {

    }

    @Override
    public void addData(Eid eid, String subKey, Object data) {
        Eid key = MaskUtil.normalize(eid);
        ILispDAO table = getOrInstantiateVniTable(key);

        if (key.getAddress() instanceof SourceDestKey) {
            ILispDAO srcDstDao = getOrInstantiateSDInnerDao(key, table);
            srcDstDao.put(SourceDestKeyHelper.getSrc(key), new MappingEntry<Object>(subKey, data));
        } else {
            table.put(key, new MappingEntry<Object>(subKey, data));
        }
    }

    @Override
    public Object getData(Eid eid, String subKey) {
        Eid key = MaskUtil.normalize(eid);
        ILispDAO table = getVniTable(key);
        if (table == null) {
            return null;
        }

        if (key.getAddress() instanceof SourceDestKey) {
            ILispDAO srcDstDao = getSDInnerDao(key, table);
            return srcDstDao.getSpecific(SourceDestKeyHelper.getSrc(key), subKey);
        } else {
            return table.getSpecific(key, subKey);
        }
    }

    @Override
    public void removeData(Eid eid, String subKey) {
        Eid key = MaskUtil.normalize(eid);
        ILispDAO table = getVniTable(key);
        if (table == null) {
            return;
        }
        if (key.getAddress() instanceof SourceDestKey) {
            ILispDAO db = getSDInnerDao(key, table);
            if (db != null) {
                db.removeSpecific(SourceDestKeyHelper.getSrc(key), subKey);
            }
        } else {
            table.removeSpecific(key, subKey);
        }
    }
}
