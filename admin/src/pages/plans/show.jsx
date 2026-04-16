import React, { useState, useEffect } from "react";
import { Show } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Typography, Tag, Descriptions, Card, Divider, Table, Space, DatePicker } from "antd";
import dayjs from "dayjs";
import { SafetyCertificateOutlined, CalendarOutlined, HistoryOutlined } from "@ant-design/icons";
import { UserPlanManager } from "../../components/UserPlanManager";

const { Title, Text } = Typography;
const API_URL = import.meta.env.PROD ? "/api" : "http://localhost:3002/api";

export const PlanShow = () => {
    const { queryResult } = useShow();
    const { data, isLoading } = queryResult;
    const record = data?.data;

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(dayjs());

    useEffect(() => {
        if (record?.id) {
            fetchHistory(selectedDate.format('YYYY-MM-DD'));
        }
    }, [record?.id, selectedDate]);

    const fetchHistory = async (date) => {
        setHistoryLoading(true);
        try {
            const uid = record?.firebaseUid || record?.id;
            // Fetch tasks for the specific date
            const res = await fetch(`${API_URL}/daily_tasks?userId=${uid}&date=${date}&_sort=date&_order=DESC`);
            const data = await res.json();
            // 过滤掉模板记录，只显示真实的执行任务
            setHistory(Array.isArray(data) ? data.filter(t => !t.isTemplate) : []);
        } catch (e) {
            console.error("加载历史记录失败", e);
        } finally {
            setHistoryLoading(false);
        }
    };

    const historyColumns = [
        { title: "日期", dataIndex: "date", key: "date", width: 110 },
        { 
            title: "类目", 
            dataIndex: "category", 
            key: "category",
            width: 80,
            render: (cat) => {
                const labels = { diet: "饮食调养", exercise: "运动习惯", sleep: "运动习惯", mental: "心理健康", function: "功能机能", diet_herbal: "膏方调养" };
                return <Tag>{labels[cat] || cat}</Tag>;
            }
        },
        { title: "任务标题", dataIndex: "title", key: "title" },
        {
            title: "来源",
            dataIndex: "source",
            key: "source",
            width: 100,
            render: (val) => {
                const map = { 
                    ai: ["五养建议", "green"], 
                    doctor: ["医嘱下发", "blue"], 
                    custom: ["自主添加", "default"] 
                };
                const [label, color] = map[val] || ["五养建议", "green"];
                return <Tag color={color}>{label}</Tag>;
            }
        },
        { 
            title: "执行状态", 
            dataIndex: "completed", 
            key: "completed",
            width: 90,
            render: (val) => <Tag color={val ? "green" : "orange"}>{val ? "已完成" : "未打卡"}</Tag>
        }
    ];

    return (
        <Show isLoading={isLoading} title="康复执行明细">
            <Card bordered={false}>
                <div style={{ marginBottom: '24px' }}>
                    <Title level={4}><CalendarOutlined /> 康复画像概览</Title>
                    <Descriptions bordered column={2}>
                        <Descriptions.Item label="患者ID">{record?.firebaseUid || record?.id}</Descriptions.Item>
                        <Descriptions.Item label="患者姓名">{record?.nickname || record?.name || "新用户"}</Descriptions.Item>
                        <Descriptions.Item label="核心癌种">
                            <Tag color="volcano" icon={<SafetyCertificateOutlined />}>{record?.cancerType || "未设置"}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="治疗阶段">
                            <Tag color="cyan">{record?.stage || "未设置"}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="当前康复指数">
                            <Tag color={record?.coreRecoveryIndex < 70 ? "orange" : "green"} style={{ fontWeight: 'bold' }}>
                                {record?.coreRecoveryIndex || 0} 分
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="体质判定">
                            {record?.tcmAnalysisResult?.constitutionType || record?.constitution || "待辨证"}
                        </Descriptions.Item>
                    </Descriptions>
                </div>

                <Divider />

                {/* 今日计划 */}
                {record?.id && <UserPlanManager userId={record.id} />}

                <Divider />

                {/* 历史记录 */}
                <div style={{ marginTop: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Title level={4} style={{ margin: 0 }}><HistoryOutlined /> 历史执行记录</Title>
                        <DatePicker 
                            value={selectedDate} 
                            onChange={(date) => setSelectedDate(date)} 
                            allowClear={false}
                        />
                    </div>
                    <Table 
                        dataSource={history} 
                        columns={historyColumns} 
                        rowKey="id" 
                        loading={historyLoading}
                        pagination={{ pageSize: 10 }}
                        size="small"
                    />
                </div>
            </Card>
        </Show>
    );
};
