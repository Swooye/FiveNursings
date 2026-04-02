import React from "react";
import { List, useTable, ShowButton } from "@refinedev/antd";
import { Table, Tag, Space, Typography } from "antd";

const { Text } = Typography;

export const PlanList = () => {
    const { tableProps } = useTable();
    
    return (
        <List title="康复计划概览 (按用户分组)">
            <Table {...tableProps} rowKey="id">
                <Table.Column 
                    dataIndex="firebaseUid" 
                    title="用户ID" 
                    render={(val) => <Text copyable ellipsis={{ tooltip: val }} style={{ width: 80 }}>{val}</Text>}
                />
                <Table.Column 
                    dataIndex="nickname" 
                    title="患者姓名" 
                    render={(val, record) => val || record.name || "新用户"}
                />
                <Table.Column 
                    dataIndex="cancerType" 
                    title="癌种" 
                />
                <Table.Column 
                   dataIndex="stage" 
                   title="康复阶段" 
                />
                <Table.Column 
                    dataIndex="coreRecoveryIndex" 
                    title="核心康复指数" 
                    render={(val) => {
                        let color = "green";
                        if (val < 60) color = "red";
                        else if (val < 80) color = "orange";
                        return <Tag color={color} style={{ fontWeight: 'bold' }}>{val || 0} 分</Tag>;
                    }}
                />
                <Table.Column 
                    title="操作"
                    render={(_, record) => (
                        <Space>
                            <ShowButton hideText size="small" recordItemId={record.id} />
                        </Space>
                    )}
                />
            </Table>
        </List>
    );
};
