import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select, Cascader, Row, Col, Divider } from "antd";
import { chinaDivisions } from "../../utils/china-divisions";

export const ProviderCreate = () => {
    const { formProps, saveButtonProps, onFinish } = useForm();

    const handleFinish = async (values) => {
        const { region, ...rest } = values;
        const [province, city, district] = region || [];
        await onFinish({
            ...rest,
            province,
            city,
            district
        });
    };

    return (
        <Create saveButtonProps={saveButtonProps}>
            <Form 
                {...formProps} 
                layout="vertical" 
                onFinish={handleFinish}
            >
                <Form.Item label="机构名称" name="name" rules={[{ required: true }]}>
                    <Input placeholder="输入机构全称" />
                </Form.Item>

                <Divider orientation="left">地理位置</Divider>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item label="省市区" name="region" rules={[{ required: true }]}>
                            <Cascader 
                                options={chinaDivisions} 
                                placeholder="选择所在省市区" 
                                showSearch
                            />
                        </Form.Item>
                    </Col>
                    <Col span={16}>
                        <Form.Item label="详细地址" name="address" rules={[{ required: true }]}>
                            <Input placeholder="街道、门牌号等" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left">联系信息</Divider>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item label="联系人" name="contactName" rules={[{ required: true }]}>
                            <Input placeholder="联系人姓名" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label="联系电话" name="contactPhone" rules={[{ required: true }]}>
                            <Input placeholder="手机号或座机" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label="联系邮箱" name="contactEmail">
                            <Input placeholder="电子邮箱" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left">服务与专家</Divider>
                <Form.Item label="服务项" name="services" rules={[{ required: true }]}>
                    <Select 
                        mode="tags" 
                        style={{ width: '100%' }} 
                        placeholder="输入并回车以添加服务 (如: 药膳配送, 上门推拿)" 
                    />
                </Form.Item>
                <Form.Item label="签约专家" name="expertName">
                    <Input placeholder="输入专家姓名" />
                </Form.Item>
            </Form>
        </Create>
    );
};
