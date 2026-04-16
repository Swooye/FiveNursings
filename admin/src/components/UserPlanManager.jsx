import React, { useState, useEffect } from "react";
import { Table, Tag, Button, Space, Modal, Form, Input, Select, message, Popconfirm } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";

const API_URL = import.meta.env.PROD ? "/api" : "http://localhost:3002/api";

export const UserPlanManager = ({ userId }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [form] = Form.useForm();

    const fetchTasks = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`${API_URL}/daily_tasks?userId=${userId}&date=${today}`);
            const data = await response.json();
            setTasks(data);
        } catch (e) {
            message.error("获取康复计划失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [userId]);

    const handleAddTask = async (values) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`${API_URL}/daily_tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...values,
                    userId,
                    date: today,
                    completed: false,
                    isManual: true,
                    source: 'doctor',
                    isPermanent: values.isPermanent !== false // 默认持久化
                }),
            });
            if (response.ok) {
                message.success("任务下发成功");
                setIsModalOpen(false);
                form.resetFields();
                fetchTasks();
            }
        } catch (e) {
            message.error("下发失败");
        }
    };

    const handleEditTask = async (values) => {
        try {
            const response = await fetch(`${API_URL}/daily_tasks/${editingTask.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            if (response.ok) {
                message.success("任务修改成功");
                setIsModalOpen(false);
                setEditingTask(null);
                fetchTasks();
            }
        } catch (e) {
            message.error("修改失败");
        }
    };

    const handleDelete = async (id) => {
        try {
            const response = await fetch(`${API_URL}/daily_tasks/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                message.success("任务已取消");
                fetchTasks();
            }
        } catch (e) {
            message.error("操作失败");
        }
    };

    const columns = [
        {
            title: "类目",
            dataIndex: "category",
            key: "category",
            render: (cat) => {
                const labels = { diet: "饮食调养", exercise: "运动习惯", sleep: "运动习惯", mental: "心理健康", function: "功能机能", diet_herbal: "膏方调养" };
                const colors = { diet: "orange", exercise: "green", sleep: "green", mental: "blue", function: "volcano", diet_herbal: "purple" };
                return <Tag color={colors[cat] || "default"}>{labels[cat] || cat}</Tag>;
            }
        },
        { title: "任务内容", dataIndex: "title", key: "title" },
        {
            title: "频次",
            key: "frequency",
            render: (_, record) => {
                const freqMap = { daily: "每日", weekly: "每周", monthly: "每月" };
                const label = freqMap[record.frequency] || record.frequency || "每日";
                const count = record.targetCount > 1 ? ` ${record.targetCount}次` : "";
                return <Tag color="cyan">{label}{count}</Tag>;
            }
        },
        {
            title: "周期",
            key: "period",
            render: (_, record) => {
                const start = record.startDate || "-";
                const end = record.endDate || "长期有效";
                return <span style={{ fontSize: '12px' }}>{start} ~ {end}</span>;
            }
        },
        { 
            title: "状态", 
            key: "status",
            render: (_, record) => {
                const today = new Date().toISOString().split('T')[0];
                if (record.endDate && record.endDate < today) {
                    return <Tag color="error">已到期</Tag>;
                }
                return <Tag color={record.completed ? "success" : "processing"}>
                    {record.completed ? "已完成" : "进行中"}
                </Tag>;
            }
        },
        {
            title: "来源",
            dataIndex: "source",
            key: "source",
            render: (source, record) => {
                if (source === 'doctor' || record.isManual) {
                    return <Tag color="blue">医嘱下发</Tag>;
                }
                if (source === 'custom') {
                    return <Tag color="default">自主添加</Tag>;
                }
                return <Tag color="green">五养建议</Tag>;
            }
        },
        {
            title: "操作",
            key: "action",
            render: (_, record) => (
                <Space>
                    <Button 
                        type="link" 
                        icon={<EditOutlined />} 
                        onClick={() => {
                            setEditingTask(record);
                            form.setFieldsValue(record);
                            setIsModalOpen(true);
                        }} 
                    />
                    <Popconfirm title="确定取消此任务？" onConfirm={() => handleDelete(record.id)}>
                        <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        }
    ];

    return (
        <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>康复计划方案</h3>
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={() => setIsModalOpen(true)}
                >
                    下发医嘱任务
                </Button>
            </div>
            
            <Table 
                dataSource={tasks} 
                columns={columns} 
                loading={loading} 
                rowKey="id" 
                pagination={false}
                size="small"
            />

            <Modal 
                title={editingTask ? "编辑康复计划" : "手动调节康复计划"} 
                open={isModalOpen} 
                onCancel={() => {
                    setIsModalOpen(false);
                    setEditingTask(null);
                    form.resetFields();
                }}
                onOk={() => form.submit()}
            >
                <Form 
                    form={form} 
                    layout="vertical" 
                    onFinish={editingTask ? handleEditTask : handleAddTask}
                >
                    <Form.Item name="category" label="任务类型" rules={[{ required: true }]}>
                        <Select placeholder="选择五养维度">
                            <Select.Option value="diet">饮食调养</Select.Option>
                            <Select.Option value="exercise">运动习惯（含睡眠管理）</Select.Option>
                            <Select.Option value="function">功能机能</Select.Option>
                            <Select.Option value="mental">心理健康</Select.Option>
                            <Select.Option value="diet_herbal">膏方调养</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="title" label="任务标题" rules={[{ required: true }]}>
                        <Input placeholder="输入具体任务指令" />
                    </Form.Item>
                    <Space style={{ width: '100%' }}>
                        <Form.Item name="frequency" label="执行频次" initialValue="daily" style={{ flex: 1 }}>
                            <Select>
                                <Select.Option value="daily">每日</Select.Option>
                                <Select.Option value="weekly">每周</Select.Option>
                                <Select.Option value="monthly">每月</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="targetCount" label="执行次数" initialValue={1} style={{ flex: 1 }}>
                            <Select>
                                {[1, 2, 3, 4, 5].map(v => <Select.Option key={v} value={v}>{v}次</Select.Option>)}
                            </Select>
                        </Form.Item>
                    </Space>
                    <Space style={{ width: '100%' }}>
                        <Form.Item name="startDate" label="开始日期" initialValue={new Date().toISOString().split('T')[0]} style={{ flex: 1 }}>
                            <Input type="date" />
                        </Form.Item>
                        <Form.Item name="endDate" label="截止日期" style={{ flex: 1 }}>
                            <Input type="date" placeholder="永不截止" />
                        </Form.Item>
                    </Space>

                    <Form.Item name="isPermanent" label="是否设为长期计划" initialValue={true}>
                        <Select disabled={!!editingTask}>
                            <Select.Option value={true}>是（每天自动生成）</Select.Option>
                            <Select.Option value={false}>否（仅今日单次）</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="description" label="补充说明">
                        <Input.TextArea rows={2} placeholder="给患者的备注建议" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
