import React, { useState, useEffect } from "react";
import { Show } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Typography, Tag, Descriptions, Avatar, Card, Space, Divider, Segmented } from "antd";
import { UserOutlined, PhoneOutlined, MailOutlined, SafetyCertificateOutlined, LineChartOutlined, AreaChartOutlined } from "@ant-design/icons";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import dayjs from "dayjs";

const { Title, Text } = Typography;
const API_URL = import.meta.env.PROD ? "/api" : "http://localhost:3002/api";

export const UserShow = () => {
    const { queryResult } = useShow();
    const { data, isLoading } = queryResult;
    const record = data?.data;

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [timeRange, setTimeRange] = useState('day');
    const [hiddenMetrics, setHiddenMetrics] = useState([]);

    const toggleMetric = (value) => {
        setHiddenMetrics(prev => 
            prev.includes(value.dataKey) 
                ? prev.filter(k => k !== value.dataKey) 
                : [...prev, value.dataKey]
        );
    };

    useEffect(() => {
        if (record?.id) {
            fetchHistory();
        }
    }, [record?.id]);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/${record.id}/score-history`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            
            const historyData = await res.json();
            if (Array.isArray(historyData)) {
                setHistory(historyData.map(h => ({
                    ...h,
                    formattedDate: dayjs(h.date).format('YYYY-MM-DD')
                })));
            } else {
                setHistory([]);
            }
        } catch (e) {
            console.error("加载历史趋势失败", e);
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const renderScoreTag = (score) => {
        let color = "green";
        if (score < 60) color = "red";
        else if (score < 80) color = "orange";
        return <Tag color={color}>{score} 分</Tag>;
    };

    return (
        <Show isLoading={isLoading}>
            <Card bordered={false}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                    <Avatar
                        size={80}
                        src={record?.avatar}
                        icon={<UserOutlined />}
                        style={{ marginRight: '24px', border: '2px solid #f0f0f0' }}
                    />
                    <div>
                        <Title level={3} style={{ margin: 0 }}>{record?.nickname || record?.name || "新用户"}</Title>
                        <Space split={<Divider type="vertical" />}>
                            <Text type="secondary">
                                {record?.gender || "未知"}
                                {record?.age ? ` · ${record.age} 岁` : ""}
                            </Text>
                            <Tag color="blue">{record?.role}</Tag>
                        </Space>
                    </div>
                </div>

                <Descriptions title="联系与账号信息" bordered column={2}>
                    <Descriptions.Item label="真实姓名">{record?.name || "-"}</Descriptions.Item>
                    <Descriptions.Item label="手机号">
                        <Space><PhoneOutlined />{record?.phoneNumber || "-"}</Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="电子邮箱">
                        <Space><MailOutlined />{record?.email || "-"}</Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="出生日期">{record?.birthDate || "-"}</Descriptions.Item>
                    <Descriptions.Item label="Firebase UID">{record?.firebaseUid || "-"}</Descriptions.Item>
                    <Descriptions.Item label="身高">{record?.height ? `${record.height} cm` : "-"}</Descriptions.Item>
                    <Descriptions.Item label="体重">{record?.weight ? `${record.weight} kg` : "-"}</Descriptions.Item>
                </Descriptions>

                <Divider />

                <Descriptions title="健康档案 (康复核心指标)" bordered column={2}>
                    <Descriptions.Item label="癌种类型">
                        <Tag color="volcano" icon={<SafetyCertificateOutlined />}>
                            {record?.cancerType || "未设置"}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="康复阶段">
                        <Tag color="cyan">{record?.stage || "未设置"}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="中医体质">
                        <Tag color="purple">
                            {record?.tcmAnalysisResult?.constitutionType || record?.constitution || "平和质"}
                        </Tag>
                    </Descriptions.Item>
                </Descriptions>

                <Divider />

                <Descriptions title="五养康复动态评分" bordered column={6} layout="vertical">
                    <Descriptions.Item label="康复指数">
                        <Tag color="geekblue" style={{ fontSize: '16px', padding: '4px 12px' }}>
                            {record?.coreRecoveryIndex || 0} 分
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="饮食养 (Diet)">
                        {renderScoreTag(record?.scores?.diet || 0)}
                    </Descriptions.Item>
                    <Descriptions.Item label="运动养 (Exercise)">
                        {renderScoreTag(record?.scores?.exercise || 0)}
                    </Descriptions.Item>
                    <Descriptions.Item label="膏方养 (Sleep)">
                        {renderScoreTag(record?.scores?.sleep || 0)}
                    </Descriptions.Item>
                    <Descriptions.Item label="心理养 (Mental)">
                        {renderScoreTag(record?.scores?.mental || 0)}
                    </Descriptions.Item>
                    <Descriptions.Item label="功能养 (Function)">
                        {renderScoreTag(record?.scores?.function || 0)}
                    </Descriptions.Item>
                </Descriptions>

                <Divider />

                <Card 
                    title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span><LineChartOutlined /> 康复指数与五养维度趋势对比</span>
                            <Segmented 
                                options={[
                                    { label: '按日', value: 'day' },
                                    { label: '按月', value: 'month' },
                                    { label: '按年', value: 'year' },
                                ]} 
                                value={timeRange}
                                onChange={setTimeRange}
                            />
                        </div>
                    } 
                    bordered={false} 
                    className="chart-card"
                >
                    <div style={{ height: 400, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={(() => {
                                if (timeRange === 'day') {
                                    return history.map(h => ({
                                        date: dayjs(h.date).format('MM-DD'),
                                        index: h.coreRecoveryIndex,
                                        diet: h.scores?.diet || 0,
                                        exercise: h.scores?.exercise || 0,
                                        sleep: h.scores?.sleep || 0,
                                        mental: h.scores?.mental || 0,
                                        function: h.scores?.function || 0
                                    }));
                                } else if (timeRange === 'month' || timeRange === 'year') {
                                    const formatStr = timeRange === 'month' ? 'YYYY-MM' : 'YYYY';
                                    const groups = {};
                                    history.forEach(h => {
                                        const key = dayjs(h.date).format(formatStr);
                                        if (!groups[key]) {
                                            groups[key] = { date: key, count: 0, index: 0, diet: 0, exercise: 0, sleep: 0, mental: 0, function: 0 };
                                        }
                                        groups[key].count++;
                                        groups[key].index += h.coreRecoveryIndex || 0;
                                        groups[key].diet += h.scores?.diet || 0;
                                        groups[key].exercise += h.scores?.exercise || 0;
                                        groups[key].sleep += h.scores?.sleep || 0;
                                        groups[key].mental += h.scores?.mental || 0;
                                        groups[key].function += h.scores?.function || 0;
                                    });
                                    return Object.values(groups).map(g => ({
                                        date: g.date,
                                        index: Math.round(g.index / g.count),
                                        diet: Math.round(g.diet / g.count),
                                        exercise: Math.round(g.exercise / g.count),
                                        sleep: Math.round(g.sleep / g.count),
                                        mental: Math.round(g.mental / g.count),
                                        function: Math.round(g.function / g.count),
                                    })).sort((a, b) => a.date.localeCompare(b.date));
                                }
                                return [];
                            })()}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend 
                                    verticalAlign="top" 
                                    height={36} 
                                    onClick={toggleMetric}
                                    style={{ cursor: 'pointer' }}
                                    payload={[
                                        { value: '康复指数', type: 'line', dataKey: 'index', color: '#1890ff', inactive: hiddenMetrics.includes("index") },
                                        { value: '饮食', type: 'line', dataKey: 'diet', color: '#ff4d4f', inactive: hiddenMetrics.includes("diet") },
                                        { value: '运动', type: 'line', dataKey: 'exercise', color: '#52c41a', inactive: hiddenMetrics.includes("exercise") },
                                        { value: '膏方', type: 'line', dataKey: 'sleep', color: '#faad14', inactive: hiddenMetrics.includes("sleep") },
                                        { value: '心理', type: 'line', dataKey: 'mental', color: '#722ed1', inactive: hiddenMetrics.includes("mental") },
                                        { value: '功能', type: 'line', dataKey: 'function', color: '#13c2c2', inactive: hiddenMetrics.includes("function") }
                                    ]}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="index" 
                                    name="康复指数" 
                                    stroke="#1890ff" 
                                    strokeWidth={4} 
                                    dot={{ r: 6 }} 
                                    activeDot={{ r: 8 }} 
                                    zIndex={10} 
                                    hide={hiddenMetrics.includes("index")}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="diet" 
                                    name="饮食" 
                                    stroke="#ff4d4f" 
                                    strokeDasharray="5 5" 
                                    hide={hiddenMetrics.includes("diet")}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="exercise" 
                                    name="运动" 
                                    stroke="#52c41a" 
                                    strokeDasharray="5 5" 
                                    hide={hiddenMetrics.includes("exercise")}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="sleep" 
                                    name="膏方" 
                                    stroke="#faad14" 
                                    strokeDasharray="5 5" 
                                    hide={hiddenMetrics.includes("sleep")}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="mental" 
                                    name="心理" 
                                    stroke="#722ed1" 
                                    strokeDasharray="5 5" 
                                    hide={hiddenMetrics.includes("mental")}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="function" 
                                    name="功能" 
                                    stroke="#13c2c2" 
                                    strokeDasharray="5 5" 
                                    hide={hiddenMetrics.includes("function")}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Divider />
                {/* 康复计划方案已移至康复计划详情页，在此页去掉 */}
            </Card>
        </Show>
    );
};
