import React from "react";
import { Show } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Typography, Tag, Descriptions, Avatar, Card, Space, Divider } from "antd";
import { UserOutlined, PhoneOutlined, MailOutlined, SafetyCertificateOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export const UserShow = () => {
    const { queryResult } = useShow();
    const { data, isLoading } = queryResult;
    const record = data?.data;

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
                        <Tag color="purple">{record?.constitution || "平和质"}</Tag>
                    </Descriptions.Item>
                </Descriptions>

                <Divider />

                <Descriptions title="五养康复动态评分" bordered column={5} layout="vertical">
                    <Descriptions.Item label="饮食养 (Diet)">
                        {renderScoreTag(record?.scores?.diet || 0)}
                    </Descriptions.Item>
                    <Descriptions.Item label="运动养 (Exercise)">
                        {renderScoreTag(record?.scores?.exercise || 0)}
                    </Descriptions.Item>
                    <Descriptions.Item label="睡眠养 (Sleep)">
                        {renderScoreTag(record?.scores?.sleep || 0)}
                    </Descriptions.Item>
                    <Descriptions.Item label="心理养 (Mental)">
                        {renderScoreTag(record?.scores?.mental || 0)}
                    </Descriptions.Item>
                    <Descriptions.Item label="功能养 (Function)">
                        {renderScoreTag(record?.scores?.function || 0)}
                    </Descriptions.Item>
                </Descriptions>
            </Card>
        </Show>
    );
};
