import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, RefreshControl, Dimensions, TextInput,
    Alert, Platform, Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiConfig from '../config/api';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

// ─── Colour palette ────────────────────────────────────────────
const C = {
    ok:      '#10B981',
    warn:    '#F59E0B',
    crit:    '#EF4444',
    blue:    '#3B82F6',
    purple:  '#8B5CF6',
    bg:      '#F1F5F9',
    card:    '#FFFFFF',
    border:  '#E2E8F0',
    text:    '#1E293B',
    sub:     '#64748B',
    muted:   '#94A3B8',
    header:  '#0F172A',
};

// ─── Tiny Mini-Bar ─────────────────────────────────────────────
const MiniBar = ({ value, maxValue, color = C.blue, label, suffix = '' }) => {
    const pct = maxValue > 0 ? Math.min(100, (Number(value) / Number(maxValue)) * 100) : 0;
    return (
        <View style={mb.row}>
            <Text style={mb.label} numberOfLines={1}>{label}</Text>
            <View style={mb.track}>
                <View style={[mb.fill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text style={mb.val}>{value}{suffix}</Text>
        </View>
    );
};
const mb = StyleSheet.create({
    row:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    label: { width: 95, fontSize: 11, color: C.sub, marginRight: 8 },
    track: { flex: 1, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
    fill:  { height: '100%', borderRadius: 4 },
    val:   { width: 44, fontSize: 11, fontWeight: '700', color: C.text, textAlign: 'right' },
});

// ─── Pill filter bar ───────────────────────────────────────────
const Segment = ({ options, value, onChange }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {options.map(opt => (
            <TouchableOpacity
                key={opt.value}
                onPress={() => onChange(opt.value)}
                style={[sg.pill, value === opt.value && sg.active]}
            >
                <Text style={[sg.txt, value === opt.value && sg.aTxt]}>{opt.label}</Text>
            </TouchableOpacity>
        ))}
    </ScrollView>
);
const sg = StyleSheet.create({
    pill:  { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E2E8F0', marginRight: 8 },
    active:{ backgroundColor: C.header },
    txt:   { fontSize: 12, color: C.sub, fontWeight: '600' },
    aTxt:  { color: '#FFF' },
});

// ─── KPI card ──────────────────────────────────────────────────
const KpiCard = ({ label, value, color = C.text, icon }) => (
    <View style={[kp.card, { borderTopColor: color, width: CARD_W }]}>
        <Text style={kp.icon}>{icon}</Text>
        <Text style={[kp.val, { color }]}>{value}</Text>
        <Text style={kp.label}>{label}</Text>
    </View>
);
const kp = StyleSheet.create({
    card:  { backgroundColor: C.card, borderRadius: 14, padding: 16, borderTopWidth: 4, elevation: 2, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
    icon:  { fontSize: 20, marginBottom: 4 },
    val:   { fontSize: 26, fontWeight: '800', marginBottom: 2 },
    label: { fontSize: 11, color: C.sub, fontWeight: '600' },
});

// ─── Alert row ─────────────────────────────────────────────────
const AlertRow = ({ icon, message, type, index }) => {
    const color = type === 'CRITICAL' ? C.crit : type === 'WARNING' ? C.warn : C.blue;
    const bg    = type === 'CRITICAL' ? '#FEF2F2' : type === 'WARNING' ? '#FFFBEB' : '#EFF6FF';
    return (
        <View style={[ar.row, { backgroundColor: bg, borderLeftColor: color }]}>
            <Text style={ar.icon}>{icon}</Text>
            <Text style={[ar.text, { color }]}>{message}</Text>
        </View>
    );
};
const ar = StyleSheet.create({
    row:  { flexDirection: 'row', alignItems: 'flex-start', padding: 12, marginBottom: 8, borderRadius: 10, borderLeftWidth: 4 },
    icon: { fontSize: 15, marginRight: 8, marginTop: 1 },
    text: { flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 18 },
});

// ─── Section title ─────────────────────────────────────────────
const Heading = ({ title, sub }) => (
    <View style={{ marginBottom: 10, marginTop: 18 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: C.text }}>{title}</Text>
        {sub ? <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</Text> : null}
    </View>
);

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const InventoryReports = ({ token, onBack }) => {
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData]             = useState(null);
    const [activeTab, setActiveTab]   = useState('overview'); // overview | area | items | alerts
    const [search, setSearch]         = useState('');
    const [sortField, setSortField]   = useState('item_name');
    const [sortAsc, setSortAsc]       = useState(true);
    const [pdfLoading, setPdfLoading] = useState(false);

    // Filters
    const [selArea,   setSelArea]   = useState('All');
    const [selStatus, setSelStatus] = useState('All');
    const [selPeriod, setSelPeriod] = useState('month');

    const hdrs = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    const dateRange = (period) => {
        const now   = new Date();
        const today = now.toISOString().split('T')[0];
        if (period === 'day')  return { start: today, end: today };
        if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); return { start: d.toISOString().split('T')[0], end: today }; }
        if (period === 'year') return { start: `${now.getFullYear()}-01-01`, end: today };
        return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], end: today };
    };

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        const { start, end } = dateRange(selPeriod);
        const qs = `?startDate=${start}&endDate=${end}&area=${selArea}&status=${selStatus}`;
        try {
            const res = await fetch(`${apiConfig.API_BASE_URL}/api/inventory/analytics/advanced${qs}`, { headers: hdrs });
            if (res.ok) setData(await res.json());
        } catch (e) { console.error('Reports fetch:', e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [token, selArea, selStatus, selPeriod]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = () => { setRefreshing(true); fetchData(true); };

    // ── PDF / Share ─────────────────────────────────────────────
    const handleDownloadPDF = async () => {
        if (!data) return;
        setPdfLoading(true);
        try {
            const { start, end } = dateRange(selPeriod);
            const S = data.summary || {};
            const alerts = data.alerts || [];
            const lowStock = data.low_stock_alerts || [];
            const topConsumed = data.top_consumed || [];

            // Build a plain-text report (shareable anywhere)
            const lines = [
                '═══════════════════════════════════════════',
                "      MELISSA'S FOOD COURT",
                '       INVENTORY STATUS REPORT',
                '═══════════════════════════════════════════',
                `Report Period  : ${start} → ${end}`,
                `Generated At   : ${new Date().toLocaleString()}`,
                `Filter — Area  : ${selArea}   Status: ${selStatus}`,
                '',
                '────────── SUMMARY ─────────────────────────',
                `Total Items    : ${S.total_items}`,
                `Healthy Stock  : ${S.healthy_count}`,
                `Low Stock      : ${S.low_stock_count}`,
                `Out of Stock   : ${S.out_of_stock_count}`,
                `Total Quantity : ${parseFloat(S.total_qty || 0).toFixed(1)} units`,
                '',
                '────────── STOCK ALERTS ────────────────────',
                ...(alerts.length === 0
                    ? ['  ✅ No critical stock alerts']
                    : alerts.map(a => `  ${a.icon} [${a.type}] ${a.message}`)),
                '',
                '────────── LOW STOCK ITEMS ─────────────────',
                ...(lowStock.length === 0
                    ? ['  All items are at healthy levels']
                    : lowStock.map(i =>
                        `  • ${i.item_name.padEnd(20)} ${String(i.quantity).padStart(6)} ${(i.unit || '').padEnd(6)}  [${i.status}]`
                      )),
                '',
                '────────── TOP CONSUMED ITEMS ──────────────',
                ...(topConsumed.length === 0
                    ? ['  No consumption data for this period']
                    : topConsumed.map((t, idx) =>
                        `  ${idx + 1}. ${t.item_name.padEnd(22)} ${parseFloat(t.total_consumed).toFixed(1)} ${t.unit}`
                      )),
                '',
                '────────── AREA BREAKDOWN ──────────────────',
                ...(data.charts?.area_comparison || []).map(a =>
                    `  ${a.area.padEnd(12)} ${a.item_count} items  ✓${a.available} ⚠${a.low_stock} ✕${a.out_of_stock}`
                ),
                '',
                '═══════════════════════════════════════════',
                "  Melissa's Food Court — Inventory System",
                '═══════════════════════════════════════════',
            ];

            const reportText = lines.join('\n');

            if (Platform.OS === 'web') {
                // Web: trigger download as .txt
                const blob = new Blob([reportText], { type: 'text/plain' });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href     = url;
                a.download = `inventory_report_${start}_${end}.txt`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                // Native: use Share sheet
                await Share.share({
                    title:   `Inventory Report — ${start} to ${end}`,
                    message: reportText,
                });
            }
        } catch (e) {
            Alert.alert('Export Error', 'Could not generate the report. Please try again.');
        } finally {
            setPdfLoading(false);
        }
    };

    // ── Sorted/filtered list ────────────────────────────────────
    const filteredList = (data?.inventory_list || [])
        .filter(item => item.item_name?.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            const av = a[sortField] ?? '';
            const bv = b[sortField] ?? '';
            const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
            return sortAsc ? cmp : -cmp;
        });

    const toggleSort = (f) => {
        if (sortField === f) setSortAsc(!sortAsc);
        else { setSortField(f); setSortAsc(true); }
    };

    const statusColor = (s) => s === 'Available' ? C.ok : s === 'Low Stock' ? C.warn : C.crit;

    // ─────────────────────────────────────────────────────────────
    if (loading) return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <SafeAreaView edges={['top']} style={{ backgroundColor: C.header }} />
            <View style={[s.hdr]}>
                <TouchableOpacity onPress={onBack} style={s.backBtn}>
                    <Text style={{ color: '#FFF', fontSize: 22 }}>←</Text>
                </TouchableOpacity>
                <Text style={s.hdrTitle}>Inventory Reports</Text>
                <View style={{ width: 40 }} />
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={C.blue} />
                <Text style={{ color: C.sub, marginTop: 12, fontSize: 14 }}>Loading Analytics...</Text>
            </View>
        </View>
    );

    const S = data?.summary || {};
    const charts = data?.charts || {};
    const { start, end } = dateRange(selPeriod);

    // ══════════════════════════════════════════════════════════
    // TAB — OVERVIEW
    // ══════════════════════════════════════════════════════════
    const renderOverview = () => (
        <ScrollView
            style={s.scroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
        >
            {/* Filters */}
            <View style={s.filterCard}>
                <Text style={s.filterLbl}>TIME PERIOD</Text>
                <Segment
                    options={[
                        { label: '📅 Today', value: 'day' },
                        { label: '📆 Week',  value: 'week' },
                        { label: '🗓 Month', value: 'month' },
                        { label: '📊 Year',  value: 'year' },
                    ]}
                    value={selPeriod}
                    onChange={setSelPeriod}
                />
                <Text style={s.filterLbl}>AREA</Text>
                <Segment
                    options={[
                        { label: 'All Areas',  value: 'All'     },
                        { label: '🍳 Kitchen', value: 'Kitchen' },
                        { label: '🍹 Bar',     value: 'Bar'     },
                        { label: '📦 General', value: 'General' },
                    ]}
                    value={selArea}
                    onChange={setSelArea}
                />
                <Text style={s.filterLbl}>STATUS</Text>
                <Segment
                    options={[
                        { label: 'All',             value: 'All'          },
                        { label: '✅ Available',    value: 'Available'    },
                        { label: '⚠️ Low Stock',    value: 'Low Stock'    },
                        { label: '🚨 Out of Stock', value: 'Out of Stock' },
                    ]}
                    value={selStatus}
                    onChange={setSelStatus}
                />
            </View>

            {/* KPIs */}
            <Heading title="Summary" sub={`${start} → ${end}`} />
            <View style={s.kpiGrid}>
                <KpiCard icon="📦" label="Total Items"   value={S.total_items         || 0} color={C.blue} />
                <KpiCard icon="✅" label="Healthy"       value={S.healthy_count        || 0} color={C.ok}   />
                <KpiCard icon="⚠️" label="Low Stock"    value={S.low_stock_count      || 0} color={C.warn}  />
                <KpiCard icon="🚨" label="Out of Stock" value={S.out_of_stock_count   || 0} color={C.crit}  />
            </View>

            {/* Category distribution */}
            {charts.category_distribution?.length > 0 && (
                <View style={s.chartCard}>
                    <Text style={s.chartTitle}>📊 Category Distribution</Text>
                    {charts.category_distribution.map((cat, idx) => {
                        const maxQ = Math.max(...charts.category_distribution.map(c => c.total_qty), 1);
                        const barColors = [C.blue, C.ok, C.warn, C.purple, C.crit];
                        return (
                            <MiniBar
                                key={`cat-${idx}`}
                                label={cat.category || 'Other'}
                                value={parseFloat(cat.total_qty).toFixed(0)}
                                maxValue={maxQ}
                                color={barColors[idx % barColors.length]}
                            />
                        );
                    })}
                </View>
            )}

            {/* Status distribution */}
            {charts.status_distribution?.length > 0 && (
                <View style={s.chartCard}>
                    <Text style={s.chartTitle}>🍩 Status Breakdown</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {charts.status_distribution.map((st, idx) => (
                            <View key={`st-${idx}`} style={[s.statBox, { borderColor: statusColor(st.status) }]}>
                                <Text style={[s.statVal, { color: statusColor(st.status) }]}>{st.count}</Text>
                                <Text style={s.statLbl}>{st.status}</Text>
                                <Text style={s.statQty}>{parseFloat(st.total_qty).toFixed(0)} units</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Top consumed */}
            {data?.top_consumed?.length > 0 && (
                <View style={s.chartCard}>
                    <Text style={s.chartTitle}>🔥 Most Consumed This Period</Text>
                    {data.top_consumed.map((item, idx) => {
                        const maxC = Math.max(...data.top_consumed.map(t => t.total_consumed), 1);
                        return (
                            <MiniBar
                                key={`tc-${idx}`}
                                label={item.item_name}
                                value={parseFloat(item.total_consumed).toFixed(0)}
                                maxValue={maxC}
                                color={idx === 0 ? C.crit : idx === 1 ? C.warn : C.blue}
                                suffix={` ${item.unit}`}
                            />
                        );
                    })}
                </View>
            )}

            {/* Usage trend */}
            {charts.usage_trend?.length > 0 && (
                <View style={s.chartCard}>
                    <Text style={s.chartTitle}>📈 Daily Usage Trend</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 80, marginTop: 8 }}>
                        {charts.usage_trend.slice(-14).map((d, idx) => {
                            const maxC = Math.max(...charts.usage_trend.map(t => t.consumed || 0), 1);
                            const barH = ((d.consumed || 0) / maxC) * 60;
                            return (
                                <View key={`ut-${idx}`} style={{ flex: 1, alignItems: 'center' }}>
                                    <View style={{ width: '80%', height: Math.max(4, barH), backgroundColor: C.blue, borderRadius: 3 }} />
                                    <Text style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>{d.date?.slice(5)}</Text>
                                </View>
                            );
                        })}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: C.blue }} />
                        <Text style={{ fontSize: 10, color: C.sub }}>Daily Consumption</Text>
                    </View>
                </View>
            )}

            {/* Transaction summary */}
            {data?.transaction_summary?.length > 0 && (
                <View style={s.chartCard}>
                    <Text style={s.chartTitle}>🔄 Stock Transactions</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {data.transaction_summary.map((t, idx) => {
                            const tc = t.action_type === 'ADD' ? C.ok : t.action_type === 'REDUCE' ? C.crit : t.action_type === 'RESTOCK' ? C.blue : C.warn;
                            return (
                                <View key={`tx-${idx}`} style={[s.statBox, { borderColor: tc }]}>
                                    <Text style={[s.statVal, { color: tc }]}>{t.transaction_count}</Text>
                                    <Text style={s.statLbl}>{t.action_type}</Text>
                                    <Text style={s.statQty}>{parseFloat(t.total_qty).toFixed(0)} units</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}

            <View style={{ height: 30 }} />
        </ScrollView>
    );

    // ══════════════════════════════════════════════════════════
    // TAB — AREA-WISE
    // ══════════════════════════════════════════════════════════
    const renderAreaWise = () => {
        const areaWise = data?.area_wise || {};
        const areaComp = data?.charts?.area_comparison || [];
        const areas = Object.keys(areaWise);

        return (
            <ScrollView
                style={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {areaComp.length > 0 && (
                    <View style={s.chartCard}>
                        <Text style={s.chartTitle}>🏢 Stock Health by Area</Text>
                        {areaComp.map((a, idx) => {
                            const total = (a.available || 0) + (a.low_stock || 0) + (a.out_of_stock || 0);
                            const pOk  = total > 0 ? ((a.available   || 0) / total) * 100 : 0;
                            const pLow = total > 0 ? ((a.low_stock    || 0) / total) * 100 : 0;
                            const pOut = total > 0 ? ((a.out_of_stock || 0) / total) * 100 : 0;
                            return (
                                <View key={`ac-${idx}`} style={{ marginBottom: 16 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{a.area}</Text>
                                        <Text style={{ fontSize: 11, color: C.sub }}>{a.item_count} items · {parseFloat(a.total_qty || 0).toFixed(0)} units</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: '#E2E8F0' }}>
                                        {pOk  > 0 && <View style={{ flex: pOk,  backgroundColor: C.ok   }} />}
                                        {pLow > 0 && <View style={{ flex: pLow, backgroundColor: C.warn  }} />}
                                        {pOut > 0 && <View style={{ flex: pOut, backgroundColor: C.crit  }} />}
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                                        <Text style={{ fontSize: 10, color: C.ok   }}>✓ {a.available || 0} OK</Text>
                                        <Text style={{ fontSize: 10, color: C.warn }}>⚠ {a.low_stock || 0} Low</Text>
                                        <Text style={{ fontSize: 10, color: C.crit }}>✕ {a.out_of_stock || 0} Out</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {areas.map((area, aIdx) => {
                    const items = areaWise[area] || [];
                    const aColor = area === 'Kitchen' ? '#F97316' : area === 'Bar' ? C.purple : C.blue;
                    return (
                        <View key={`area-${aIdx}`} style={{ marginBottom: 14 }}>
                            <View style={[s.areaHdr, { borderLeftColor: aColor }]}>
                                <Text style={[s.areaTitle, { color: aColor }]}>
                                    {area === 'Kitchen' ? '🍳' : area === 'Bar' ? '🍹' : '📦'} {area}
                                    <Text style={{ fontWeight: '400', fontSize: 12, color: C.sub }}>  ({items.length} items)</Text>
                                </Text>
                            </View>
                            {items.slice(0, 6).map((item, iIdx) => (
                                <View key={`ai-${aIdx}-${iIdx}`} style={s.areaRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.areaRowName} numberOfLines={1}>{item.item_name}</Text>
                                        <Text style={s.areaRowSub}>{item.supplier_name || 'No supplier'}</Text>
                                    </View>
                                    <Text style={s.areaRowQty}>{item.quantity} {item.unit}</Text>
                                    <View style={[s.badge, { backgroundColor: statusColor(item.status) + '22' }]}>
                                        <Text style={[s.badgeTxt, { color: statusColor(item.status) }]}>
                                            {item.status === 'Out of Stock' ? 'OUT' : item.status === 'Low Stock' ? 'LOW' : 'OK'}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                            {items.length > 6 && (
                                <Text style={{ fontSize: 11, color: C.blue, textAlign: 'center', paddingVertical: 6 }}>
                                    +{items.length - 6} more items
                                </Text>
                            )}
                        </View>
                    );
                })}

                <View style={{ height: 30 }} />
            </ScrollView>
        );
    };

    // ══════════════════════════════════════════════════════════
    // TAB — ITEMS TABLE
    // ══════════════════════════════════════════════════════════
    const renderItems = () => (
        <View style={{ flex: 1 }}>
            {/* Search bar */}
            <View style={s.searchWrap}>
                <Text style={{ fontSize: 15, marginRight: 8 }}>🔍</Text>
                <TextInput
                    style={s.searchIn}
                    placeholder="Search inventory items..."
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor={C.muted}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Text style={{ fontSize: 17, color: C.sub }}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                    {/* Table header */}
                    <View style={[s.tRow, s.tHd]}>
                        {[
                            ['Item Name', 'item_name', 145],
                            ['Area',      'category',   80],
                            ['Qty',       'quantity',   70],
                            ['Unit',      'unit',       65],
                            ['Status',    'status',     85],
                        ].map(([lbl, field, w]) => (
                            <TouchableOpacity
                                key={`th-${field}`}
                                onPress={() => toggleSort(field)}
                                style={[s.tCell, { width: w }]}
                            >
                                <Text style={s.tHdTxt}>{lbl} {sortField === field ? (sortAsc ? '↑' : '↓') : ''}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Table body */}
                    <ScrollView style={{ maxHeight: 480 }} nestedScrollEnabled showsVerticalScrollIndicator>
                        {filteredList.length === 0 ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Text style={{ color: C.muted }}>No items match your search.</Text>
                            </View>
                        ) : filteredList.map((item, idx) => (
                            <View key={`row-${item.id}-${idx}`} style={[s.tRow, idx % 2 === 0 && { backgroundColor: '#F8FAFC' }]}>
                                <View style={[s.tCell, { width: 145 }]}>
                                    <Text style={s.tCMain} numberOfLines={2}>{item.item_name}</Text>
                                    <Text style={s.tCSub}>{item.supplier_name || '—'}</Text>
                                </View>
                                <View style={[s.tCell, { width: 80 }]}>
                                    <Text style={s.tCTxt}>{item.category}</Text>
                                </View>
                                <View style={[s.tCell, { width: 70 }]}>
                                    <Text style={[s.tCTxt, { fontWeight: '700', color: item.status !== 'Available' ? C.crit : C.text }]}>
                                        {parseFloat(item.quantity).toFixed(1)}
                                    </Text>
                                </View>
                                <View style={[s.tCell, { width: 65 }]}>
                                    <Text style={s.tCTxt}>{item.unit}</Text>
                                </View>
                                <View style={[s.tCell, { width: 85 }]}>
                                    <View style={[s.badge, { backgroundColor: statusColor(item.status) + '22' }]}>
                                        <Text style={[s.badgeTxt, { color: statusColor(item.status) }]}>
                                            {item.status === 'Out of Stock' ? 'OUT' : item.status === 'Low Stock' ? 'LOW' : 'OK'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>
        </View>
    );

    // ══════════════════════════════════════════════════════════
    // TAB — ALERTS
    // ══════════════════════════════════════════════════════════
    const renderAlerts = () => {
        const alerts   = data?.alerts || [];
        const insights = data?.insights || [];
        const lowStock = data?.low_stock_alerts || [];

        return (
            <ScrollView
                style={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {alerts.length > 0 ? (
                    <>
                        <Heading title="🚨 Stock Alerts" sub={`${alerts.length} item(s) need attention`} />
                        {alerts.map((a, idx) => (
                            <AlertRow key={`al-${idx}`} icon={a.icon} message={a.message} type={a.type} />
                        ))}
                    </>
                ) : (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <Text style={{ fontSize: 40 }}>✅</Text>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginTop: 12 }}>No Stock Alerts</Text>
                        <Text style={{ fontSize: 12, color: C.sub, marginTop: 4, textAlign: 'center' }}>All inventory items are at healthy levels.</Text>
                    </View>
                )}

                {insights.length > 0 && (
                    <>
                        <Heading title="💡 Smart Insights" sub="Based on current stock data" />
                        {insights.map((ins, idx) => (
                            <AlertRow key={`ins-${idx}`} icon={ins.icon} message={ins.message} type={ins.type === 'PREDICTION' ? 'WARNING' : 'INFO'} />
                        ))}
                    </>
                )}

                {lowStock.length > 0 && (
                    <>
                        <Heading title="📋 Low Stock Details" sub="Items that need restocking soon" />
                        {lowStock.map((item, idx) => (
                            <View key={`ls-${idx}`} style={s.lowRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.lowName}>{item.item_name}</Text>
                                    <Text style={s.lowSub}>{item.category}</Text>
                                    {item.supplier_name && (
                                        <Text style={s.lowSub}>Supplier: {item.supplier_name}</Text>
                                    )}
                                    {item.supplier_phone && (
                                        <Text style={s.lowSub}>📞 {item.supplier_phone}</Text>
                                    )}
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[s.lowQty, { color: statusColor(item.status) }]}>
                                        {item.quantity} {item.unit}
                                    </Text>
                                    <Text style={{ fontSize: 10, color: C.muted }}>Min: {item.min_level}</Text>
                                    <View style={[s.badge, { backgroundColor: statusColor(item.status) + '22', marginTop: 4 }]}>
                                        <Text style={[s.badgeTxt, { color: statusColor(item.status) }]}>{item.status}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </>
                )}

                <View style={{ height: 30 }} />
            </ScrollView>
        );
    };

    // ══════════════════════════════════════════════════════════
    // TAB DEFINITIONS (no AI tab)
    // ══════════════════════════════════════════════════════════
    const TABS = [
        { key: 'overview', icon: '📊', label: 'Overview'  },
        { key: 'area',     icon: '🏢', label: 'Areas'     },
        { key: 'items',    icon: '📋', label: 'Items'     },
        { key: 'alerts',   icon: '🚨', label: 'Alerts',
          badge: (data?.alerts?.length || 0) + (data?.low_stock_alerts?.length || 0) },
    ];

    // ══════════════════════════════════════════════════════════
    // MAIN RENDER
    // ══════════════════════════════════════════════════════════
    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            {/* Safe area covers the status bar with the header colour */}
            <SafeAreaView edges={['top']} style={{ backgroundColor: C.header }} />

            {/* ── Header ── */}
            <View style={s.hdr}>
                <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '300' }}>←</Text>
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                    <Text style={s.hdrTitle}>Inventory Reports</Text>
                    <Text style={s.hdrSub}>Melissa's Food Court · {start} → {end}</Text>
                </View>

                <TouchableOpacity
                    onPress={handleDownloadPDF}
                    disabled={pdfLoading || !data}
                    style={[s.dlBtn, (pdfLoading || !data) && { opacity: 0.5 }]}
                >
                    {pdfLoading
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <Text style={s.dlBtnTxt}>⬇ Export</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity onPress={onRefresh} style={{ padding: 8 }}>
                    <Text style={{ fontSize: 18 }}>🔄</Text>
                </TouchableOpacity>
            </View>

            {/* ── Alert banner ── */}
            {((data?.alerts?.length || 0) + (data?.low_stock_alerts?.length || 0)) > 0 && (
                <TouchableOpacity
                    onPress={() => setActiveTab('alerts')}
                    style={s.alertBanner}
                >
                    <Text style={s.alertBannerTxt}>
                        🚨 {(data.alerts?.length || 0) + (data.low_stock_alerts?.length || 0)} item(s) need your attention — Tap to view
                    </Text>
                </TouchableOpacity>
            )}

            {/* ── Tab bar ── */}
            <View style={s.tabBar}>
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveTab(tab.key)}
                        style={[s.tab, activeTab === tab.key && s.tabActive]}
                    >
                        <Text style={s.tabIcon}>{tab.icon}</Text>
                        <Text style={[s.tabLbl, activeTab === tab.key && s.tabLblActive]}>{tab.label}</Text>
                        {tab.badge > 0 && (
                            <View style={s.tabBadge}>
                                <Text style={s.tabBadgeTxt}>{tab.badge}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Content ── */}
            <View style={{ flex: 1 }}>
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'area'     && renderAreaWise()}
                {activeTab === 'items'    && renderItems()}
                {activeTab === 'alerts'   && renderAlerts()}
            </View>
        </View>
    );
};

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════
const s = StyleSheet.create({
    // Header
    hdr:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.header, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
    backBtn:  { padding: 6, marginRight: 4 },
    hdrTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },
    hdrSub:   { fontSize: 10, color: '#94A3B8', marginTop: 1 },
    dlBtn:    { backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
    dlBtnTxt: { color: '#FFF', fontSize: 12, fontWeight: '700' },

    // Alert banner
    alertBanner:    { backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: C.crit, paddingHorizontal: 14, paddingVertical: 8 },
    alertBannerTxt: { color: C.crit, fontSize: 12, fontWeight: '600' },

    // Tab bar
    tabBar:      { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, elevation: 2 },
    tab:         { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
    tabActive:   { borderBottomWidth: 3, borderBottomColor: C.blue },
    tabIcon:     { fontSize: 16, marginBottom: 2 },
    tabLbl:      { fontSize: 9, color: C.muted, fontWeight: '600' },
    tabLblActive:{ color: C.blue, fontWeight: '700' },
    tabBadge:    { position: 'absolute', top: 5, right: 5, backgroundColor: C.crit, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    tabBadgeTxt: { fontSize: 8, color: '#FFF', fontWeight: '800' },

    // Scroll & filter
    scroll:     { flex: 1, padding: 14 },
    filterCard: { backgroundColor: C.card, padding: 14, borderRadius: 14, marginBottom: 2, elevation: 1 },
    filterLbl:  { fontSize: 10, fontWeight: '700', color: C.sub, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 },

    // KPI grid
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

    // Chart cards
    chartCard:  { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8 },
    chartTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 14 },

    // Stat boxes
    statBox: { flex: 1, minWidth: '28%', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5 },
    statVal: { fontSize: 20, fontWeight: '800' },
    statLbl: { fontSize: 10, color: C.sub, marginTop: 2 },
    statQty: { fontSize: 9, color: C.muted, marginTop: 1 },

    // Badge
    badge:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    badgeTxt: { fontSize: 9, fontWeight: '700' },

    // Area tab
    areaHdr:     { borderLeftWidth: 3, paddingLeft: 10, marginBottom: 8, marginTop: 4 },
    areaTitle:   { fontSize: 14, fontWeight: '800' },
    areaRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, padding: 10, marginBottom: 6, elevation: 1 },
    areaRowName: { fontSize: 13, fontWeight: '600', color: C.text },
    areaRowSub:  { fontSize: 10, color: C.muted, marginTop: 1 },
    areaRowQty:  { fontSize: 13, fontWeight: '700', color: C.text, marginRight: 10 },

    // Search
    searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, margin: 12, marginBottom: 0, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
    searchIn:   { flex: 1, fontSize: 14, color: C.text },

    // Items table
    tRow:   { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
    tHd:    { backgroundColor: '#F1F5F9' },
    tCell:  { padding: 10, justifyContent: 'center' },
    tHdTxt: { fontSize: 10, fontWeight: '700', color: C.sub, textTransform: 'uppercase' },
    tCMain: { fontSize: 12, fontWeight: '600', color: C.text },
    tCSub:  { fontSize: 9, color: C.muted },
    tCTxt:  { fontSize: 12, color: C.text },

    // Low stock
    lowRow:  { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1 },
    lowName: { fontSize: 14, fontWeight: '700', color: C.text },
    lowSub:  { fontSize: 10, color: C.sub, marginTop: 2 },
    lowQty:  { fontSize: 16, fontWeight: '800' },
});

export default InventoryReports;
