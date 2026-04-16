import React, { useState } from "react";
import { List, useTable, ShowButton, DeleteButton, TextField } from "@refinedev/antd";
import { Table, Space, Tag, Button, Modal, Form, Input, Select, message, Tooltip, Badge } from "antd";
import { SearchOutlined, CarOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useUpdate } from "@refinedev/core";

const API_URL = import.meta.env.PROD ? "/api" : "http://localhost:3002/api";

const STATUS_MAP = {
    pending:    { label: "待支付",   color: "default" },
    paid:       { label: "已支付",   color: "blue" },
    processing: { label: "处理中",   color: "processing" },
    shipped:    { label: "已发货",   color: "cyan" },
    delivered:  { label: "已签收",   color: "green" },
    cancelled:  { label: "已取消",   color: "red" },
    refunded:   { label: "已退款",   color: "orange" },
};

const EXPRESS_COMPANIES = [
    "顺丰速运", "圆通速递", "中通快递", "申通快递", "韵达快递",
    "京东物流", "邮政EMS", "德邦物流", "百世快递", "极兔速递"
];

export const OrderList = () => {
    const { tableProps, setFilters } = useTable({ syncWithLocation: true });
    const { mutate } = useUpdate();

    const [shippingModal, setShippingModal] = useState({ open: false, record: null });
    const [statusModal, setStatusModal] = useState({ open: false, record: null });
    const [shippingForm] = Form.useForm();
    const [statusForm] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    // --- 录入快递单号 ---
    const openShipping = (record) => {
        shippingForm.setFieldsValue({
            expressCompany: record.expressCompany || undefined,
            expressNo: record.expressNo || "",
        });
        setShippingModal({ open: true, record });
    };

    const submitShipping = async () => {
        try {
            const values = await shippingForm.validateFields();
            setSubmitting(true);
            const res = await fetch(`${API_URL}/orders/${shippingModal.record.id}/shipping`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "操作失败");
            message.success('快递信息已保存，订单状态已更新为【已发货】');
            setShippingModal({ open: false, record: null });
            // 刷新列表
            setFilters([], "replace");
        } catch (e) {
            message.error(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    // --- 变更订单状态 ---
    const openStatus = (record) => {
        statusForm.setFieldsValue({ status: record.status, cancelReason: "" });
        setStatusModal({ open: true, record });
    };

    const submitStatus = async () => {
        try {
            const values = await statusForm.validateFields();
            setSubmitting(true);
            const res = await fetch(`${API_URL}/orders/${statusModal.record.id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "操作失败");
            message.success("订单状态已更新");
            setStatusModal({ open: false, record: null });
            setFilters([], "replace");
        } catch (e) {
            message.error(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <List
                headerButtons={
                    <Space>
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="搜索订单号"
                            allowClear
                            style={{ width: 200 }}
                            onPressEnter={(e) =>
                                setFilters([{ field: "orderNo", operator: "contains", value: e.target.value }], "replace")
                            }
                        />
                        <Select
                            placeholder="筛选状态"
                            allowClear
                            style={{ width: 140 }}
                            onChange={(v) =>
                                setFilters(v ? [{ field: "status", operator: "eq", value: v }] : [], "replace")
                            }
                            options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))}
                        />
                    </Space>
                }
            >
                <Table {...tableProps} rowKey="id" scroll={{ x: 1100 }}>
                    <Table.Column
                        dataIndex="orderNo"
                        title="订单号"
                        width={200}
                        render={(v) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</span>}
                    />
                    <Table.Column
                        dataIndex="userName"
                        title="客户"
                        width={120}
                        render={(v, r) => (
                            <div>
                                <div>{v || "—"}</div>
                                <div style={{ color: "#888", fontSize: 12 }}>{r.userPhone}</div>
                            </div>
                        )}
                    />
                    <Table.Column
                        dataIndex="items"
                        title="商品"
                        width={200}
                        render={(items) =>
                            Array.isArray(items) && items.length > 0 ? (
                                <div>
                                    {items.map((item, i) => (
                                        <div key={i} style={{ fontSize: 12 }}>
                                            {item.name} × {item.quantity}
                                        </div>
                                    ))}
                                </div>
                            ) : "—"
                        }
                    />
                    <Table.Column
                        dataIndex="totalAmount"
                        title="金额"
                        width={100}
                        render={(v, r) => (
                            <div>
                                {v ? <div>¥{v}</div> : null}
                                {r.totalPoints ? <div style={{ color: "#f90", fontSize: 12 }}>{r.totalPoints}积分</div> : null}
                            </div>
                        )}
                    />
                    <Table.Column
                        dataIndex="status"
                        title="状态"
                        width={100}
                        render={(v) => {
                            const s = STATUS_MAP[v] || { label: v, color: "default" };
                            return <Tag color={s.color}>{s.label}</Tag>;
                        }}
                    />
                    <Table.Column
                        dataIndex="expressNo"
                        title="快递信息"
                        width={180}
                        render={(v, r) =>
                            v ? (
                                <Tooltip title={`${r.expressCompany || ""} ${v}`}>
                                    <Tag icon={<CarOutlined />} color="cyan">
                                        {r.expressCompany ? `${r.expressCompany} ` : ""}{v}
                                    </Tag>
                                </Tooltip>
                            ) : (
                                <span style={{ color: "#bbb" }}>未填写</span>
                            )
                        }
                    />
                    <Table.Column
                        dataIndex="createdAt"
                        title="下单时间"
                        width={150}
                        render={(v) => v ? new Date(v).toLocaleString("zh-CN") : "—"}
                    />
                    <Table.Column
                        title="操作"
                        width={220}
                        fixed="right"
                        render={(_, record) => (
                            <Space size="small" wrap>
                                <ShowButton hideText size="small" recordItemId={record.id} />
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<CarOutlined />}
                                    onClick={() => openShipping(record)}
                                >
                                    录入快递
                                </Button>
                                <Button
                                    size="small"
                                    onClick={() => openStatus(record)}
                                >
                                    改状态
                                </Button>
                                <DeleteButton hideText size="small" recordItemId={record.id} />
                            </Space>
                        )}
                    />
                </Table>
            </List>

            {/* 录入快递单号弹窗 */}
            <Modal
                title={
                    <Space>
                        <CarOutlined style={{ color: "#1890ff" }} />
                        录入快递信息
                    </Space>
                }
                open={shippingModal.open}
                onOk={submitShipping}
                onCancel={() => setShippingModal({ open: false, record: null })}
                confirmLoading={submitting}
                okText="保存并发货"
                cancelText="取消"
            >
                <div style={{ marginBottom: 12, color: "#666", fontSize: 13 }}>
                    订单号：<strong>{shippingModal.record?.orderNo}</strong>
                </div>
                <Form form={shippingForm} layout="vertical">
                    <Form.Item label="快递公司" name="expressCompany">
                        <Select
                            placeholder="请选择快递公司"
                            showSearch
                            allowClear
                            options={EXPRESS_COMPANIES.map((c) => ({ value: c, label: c }))}
                        />
                    </Form.Item>
                    <Form.Item
                        label="快递单号"
                        name="expressNo"
                        rules={[{ required: true, message: "请输入快递单号" }]}
                    >
                        <Input placeholder="请输入快递单号" />
                    </Form.Item>
                </Form>
                <div style={{ padding: "8px 12px", background: "#e6f7ff", borderRadius: 6, fontSize: 13, color: "#1890ff" }}>
                    <CheckCircleOutlined /> 保存后订单状态将自动更新为"已发货"
                </div>
            </Modal>

            {/* 变更状态弹窗 */}
            <Modal
                title="变更订单状态"
                open={statusModal.open}
                onOk={submitStatus}
                onCancel={() => setStatusModal({ open: false, record: null })}
                confirmLoading={submitting}
                okText="确认更新"
                cancelText="取消"
            >
                <div style={{ marginBottom: 12, color: "#666", fontSize: 13 }}>
                    订单号：<strong>{statusModal.record?.orderNo}</strong>　
                    当前状态：<Tag color={STATUS_MAP[statusModal.record?.status]?.color}>{STATUS_MAP[statusModal.record?.status]?.label}</Tag>
                </div>
                <Form form={statusForm} layout="vertical">
                    <Form.Item
                        label="新状态"
                        name="status"
                        rules={[{ required: true, message: "请选择状态" }]}
                    >
                        <Select options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: <Tag color={v.color}>{v.label}</Tag> }))} />
                    </Form.Item>
                    <Form.Item label="取消原因（取消时填写）" name="cancelReason">
                        <Input.TextArea rows={2} placeholder="可选" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};
