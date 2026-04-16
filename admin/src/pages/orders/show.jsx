import React, { useState } from "react";
import { Show } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import {
    Card, Descriptions, Tag, Button, Modal, Form, Input, Select,
    message, Space, Divider, Timeline, Table, Typography
} from "antd";
import {
    CarOutlined, ShoppingCartOutlined, UserOutlined,
    EnvironmentOutlined, CheckCircleOutlined
} from "@ant-design/icons";

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

const fmt = (d) => d ? new Date(d).toLocaleString("zh-CN") : "—";

export const OrderShow = () => {
    const { queryResult } = useShow();
    const { data, isLoading, refetch } = queryResult;
    const record = data?.data;

    const [shippingModal, setShippingModal] = useState(false);
    const [statusModal, setStatusModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [shippingForm] = Form.useForm();
    const [statusForm] = Form.useForm();

    const openShipping = () => {
        shippingForm.setFieldsValue({
            expressCompany: record?.expressCompany || undefined,
            expressNo: record?.expressNo || "",
        });
        setShippingModal(true);
    };

    const submitShipping = async () => {
        try {
            const values = await shippingForm.validateFields();
            setSubmitting(true);
            const res = await fetch(`${API_URL}/orders/${record.id}/shipping`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || "操作失败");
            message.success('快递信息已保存，订单状态已更新为【已发货】');
            setShippingModal(false);
            refetch();
        } catch (e) {
            message.error(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const openStatus = () => {
        statusForm.setFieldsValue({ status: record?.status, cancelReason: "" });
        setStatusModal(true);
    };

    const submitStatus = async () => {
        try {
            const values = await statusForm.validateFields();
            setSubmitting(true);
            const res = await fetch(`${API_URL}/orders/${record.id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || "操作失败");
            message.success("订单状态已更新");
            setStatusModal(false);
            refetch();
        } catch (e) {
            message.error(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const statusInfo = STATUS_MAP[record?.status] || { label: record?.status, color: "default" };

    // 构造时间线
    const timelineItems = [];
    if (record?.createdAt) timelineItems.push({ children: `下单时间：${fmt(record.createdAt)}`, color: "blue" });
    if (record?.paidAt) timelineItems.push({ children: `支付时间：${fmt(record.paidAt)}`, color: "blue" });
    if (record?.shippedAt) timelineItems.push({ children: `发货时间：${fmt(record.shippedAt)}`, color: "cyan" });
    if (record?.deliveredAt) timelineItems.push({ children: `签收时间：${fmt(record.deliveredAt)}`, color: "green" });
    if (record?.status === "cancelled") timelineItems.push({ children: `已取消${record.cancelReason ? `：${record.cancelReason}` : ""}`, color: "red" });

    return (
        <>
            <Show
                isLoading={isLoading}
                headerButtons={
                    <Space>
                        <Button icon={<CarOutlined />} type="primary" onClick={openShipping}>
                            录入/更新快递
                        </Button>
                        <Button onClick={openStatus}>变更状态</Button>
                    </Space>
                }
            >
                {/* 订单基本信息 */}
                <Card
                    title={<Space><ShoppingCartOutlined />订单信息</Space>}
                    style={{ marginBottom: 16 }}
                    extra={<Tag color={statusInfo.color} style={{ fontSize: 14, padding: "2px 12px" }}>{statusInfo.label}</Tag>}
                >
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label="订单号" span={2}>
                            <Typography.Text copyable style={{ fontFamily: "monospace" }}>{record?.orderNo}</Typography.Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="支付方式">
                            {{ points: "积分兑换", cash: "现金支付", mixed: "积分+现金" }[record?.paymentMethod] || "—"}
                        </Descriptions.Item>
                        <Descriptions.Item label="订单金额">
                            {record?.totalAmount ? `¥${record.totalAmount}` : "—"}
                            {record?.totalPoints ? `  /  ${record.totalPoints}积分` : ""}
                        </Descriptions.Item>
                        <Descriptions.Item label="备注" span={2}>{record?.remark || "—"}</Descriptions.Item>
                        <Descriptions.Item label="下单时间">{fmt(record?.createdAt)}</Descriptions.Item>
                        <Descriptions.Item label="更新时间">{fmt(record?.updatedAt)}</Descriptions.Item>
                    </Descriptions>
                </Card>

                {/* 客户信息 */}
                <Card title={<Space><UserOutlined />客户信息</Space>} style={{ marginBottom: 16 }}>
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label="姓名">{record?.userName || "—"}</Descriptions.Item>
                        <Descriptions.Item label="手机">{record?.userPhone || "—"}</Descriptions.Item>
                        <Descriptions.Item label="用户ID" span={2}>
                            <Typography.Text copyable>{record?.userId || "—"}</Typography.Text>
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                {/* 收货地址 */}
                {record?.shippingAddress && (
                    <Card title={<Space><EnvironmentOutlined />收货地址</Space>} style={{ marginBottom: 16 }}>
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="收件人">{record.shippingAddress.name || "—"}</Descriptions.Item>
                            <Descriptions.Item label="联系电话">{record.shippingAddress.phone || "—"}</Descriptions.Item>
                            <Descriptions.Item label="地址" span={2}>
                                {[
                                    record.shippingAddress.province,
                                    record.shippingAddress.city,
                                    record.shippingAddress.district,
                                    record.shippingAddress.address
                                ].filter(Boolean).join(" ")}
                            </Descriptions.Item>
                            <Descriptions.Item label="邮编">{record.shippingAddress.zipCode || "—"}</Descriptions.Item>
                        </Descriptions>
                    </Card>
                )}

                {/* 快递信息 */}
                <Card title={<Space><CarOutlined />快递信息</Space>} style={{ marginBottom: 16 }}>
                    {record?.expressNo ? (
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="快递公司">{record.expressCompany || "—"}</Descriptions.Item>
                            <Descriptions.Item label="快递单号">
                                <Typography.Text copyable style={{ fontFamily: "monospace" }}>{record.expressNo}</Typography.Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="录入时间">{fmt(record.expressUpdatedAt)}</Descriptions.Item>
                            <Descriptions.Item label="发货时间">{fmt(record.shippedAt)}</Descriptions.Item>
                        </Descriptions>
                    ) : (
                        <div style={{ color: "#999", padding: "12px 0" }}>
                            暂未填写快递信息
                            <Button type="link" icon={<CarOutlined />} onClick={openShipping}>立即录入</Button>
                        </div>
                    )}
                </Card>

                {/* 商品清单 */}
                {Array.isArray(record?.items) && record.items.length > 0 && (
                    <Card title={<Space><ShoppingCartOutlined />商品清单</Space>} style={{ marginBottom: 16 }}>
                        <Table
                            dataSource={record.items}
                            rowKey={(_, i) => i}
                            pagination={false}
                            size="small"
                            columns={[
                                { title: "商品名称", dataIndex: "name" },
                                { title: "单价", dataIndex: "price", render: (v) => v ? `¥${v}` : "—" },
                                { title: "积分", dataIndex: "points", render: (v) => v ? `${v}积分` : "—" },
                                { title: "数量", dataIndex: "quantity" },
                                {
                                    title: "小计",
                                    render: (_, r) => {
                                        const total = r.price ? `¥${(r.price * r.quantity).toFixed(2)}` : "";
                                        const pts = r.points ? `${r.points * r.quantity}积分` : "";
                                        return [total, pts].filter(Boolean).join(" / ") || "—";
                                    }
                                }
                            ]}
                        />
                    </Card>
                )}

                {/* 订单时间线 */}
                {timelineItems.length > 0 && (
                    <Card title="订单时间线">
                        <Timeline items={timelineItems} />
                    </Card>
                )}
            </Show>

            {/* 录入快递弹窗 */}
            <Modal
                title={<Space><CarOutlined />录入快递信息</Space>}
                open={shippingModal}
                onOk={submitShipping}
                onCancel={() => setShippingModal(false)}
                confirmLoading={submitting}
                okText="保存并发货"
            >
                <Form form={shippingForm} layout="vertical">
                    <Form.Item label="快递公司" name="expressCompany">
                        <Select placeholder="请选择快递公司" showSearch allowClear
                            options={EXPRESS_COMPANIES.map((c) => ({ value: c, label: c }))} />
                    </Form.Item>
                    <Form.Item label="快递单号" name="expressNo"
                        rules={[{ required: true, message: "请输入快递单号" }]}>
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
                open={statusModal}
                onOk={submitStatus}
                onCancel={() => setStatusModal(false)}
                confirmLoading={submitting}
                okText="确认更新"
            >
                <Form form={statusForm} layout="vertical">
                    <Form.Item label="新状态" name="status" rules={[{ required: true }]}>
                        <Select options={Object.entries(STATUS_MAP).map(([k, v]) => ({
                            value: k, label: <Tag color={v.color}>{v.label}</Tag>
                        }))} />
                    </Form.Item>
                    <Form.Item label="取消原因（仅取消时填写）" name="cancelReason">
                        <Input.TextArea rows={2} placeholder="可选" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};
