/**
 * Created by chenshj on 14-2-27.
 */
(function(gsp) {
    'use strict';
    gsp.module('EmployeeList').model('Employee', 'GSPModel', ['$dataServiceProxy', function($dataService) {
        return {
            dataModelID: '952b1aa7-285e-472b-8599-7db7936495a2',
            defaultInstance: 'EmployeeListInstance',
            primaryKey: 'ID',
            dataUri: 'PFAuditCardListInfoComponet',

            instances: {
                'EmployeeListInstance': {
                    view: '3',
                    dataSourceName: 'EmployeeListInstance',
                    defaultLoad: true,
                    filter: '',
                    sort: '',
                    pagination: {pageSize: 20}
                }
            },

            getData: function(params) {
                var self = this,
                    result = {data: {"VW_HRPFAuidtCard_Mobile": []}},
                    dataArray = result.data.VW_HRPFAuidtCard_Mobile,
                    zhangsan = {
                        "ID": "01",                   //目标卡ID
                        "State": "8",                //目标卡的状态
                        "PlanID": "",               //计划ID
                        "CaseID": "",               //方案ID
                        "CycleID": "",              //周期ID
                        "PersonID": "zhangsan",             //人员ID
                        "PersonID_Name": "张三",         //人员姓名
                        "PersonID_Email": "",        //人员Email
                        "Person_ZP": "img/1.png",             //人员照片
                        "AssSubjectID": "",         //被考核人ID
                        "FlowInstID": "",           //流程实例ID
                        "FlowInstID_STATE": "",      //流程实例状态
                        "ApproveState": "",         //审批状态
                        "VirtualState": "",         //列表上状态字段需要绑定的值
                        "EmpSumScore": "80",          //上级评分
                        "SelfScore": "95"             //自评分
                    },
                    lisi = {
                        "ID": "02",                   //目标卡ID
                        "State": "9",                //目标卡的状态
                        "PlanID": "",               //计划ID
                        "CaseID": "",               //方案ID
                        "CycleID": "",              //周期ID
                        "PersonID": "lisi",             //人员ID
                        "PersonID_Name": "李四",         //人员姓名
                        "PersonID_Email": "",        //人员Email
                        "Person_ZP": "img/2.png",             //人员照片
                        "AssSubjectID": "",         //被考核人ID
                        "FlowInstID": "",           //流程实例ID
                        "FlowInstID_STATE": "",      //流程实例状态
                        "ApproveState": "",         //审批状态
                        "VirtualState": "",         //列表上状态字段需要绑定的值
                        "EmpSumScore": "80",          //上级评分
                        "SelfScore": "94"             //自评分
                    },
                    wangwu = {
                        "ID": "03",                   //目标卡ID
                        "State": "10",                //目标卡的状态
                        "PlanID": "",               //计划ID
                        "CaseID": "",               //方案ID
                        "CycleID": "",              //周期ID
                        "PersonID": "wangwu",             //人员ID
                        "PersonID_Name": "王五",         //人员姓名
                        "PersonID_Email": "",        //人员Email
                        "Person_ZP": "img/3.png",             //人员照片
                        "AssSubjectID": "",         //被考核人ID
                        "FlowInstID": "",           //流程实例ID
                        "FlowInstID_STATE": "",      //流程实例状态
                        "ApproveState": "",         //审批状态
                        "VirtualState": "",         //列表上状态字段需要绑定的值
                        "EmpSumScore": "96",          //上级评分
                        "SelfScore": "96"             //自评分
                    },
                    chenliu = {
                        "ID": "04",                   //目标卡ID
                        "State": "11",                //目标卡的状态
                        "PlanID": "",               //计划ID
                        "CaseID": "",               //方案ID
                        "CycleID": "",              //周期ID
                        "PersonID": "chenliu",             //人员ID
                        "PersonID_Name": "陈六",         //人员姓名
                        "PersonID_Email": "",        //人员Email
                        "Person_ZP": "img/4.png",             //人员照片
                        "AssSubjectID": "",         //被考核人ID
                        "FlowInstID": "",           //流程实例ID
                        "FlowInstID_STATE": "",      //流程实例状态
                        "ApproveState": "",         //审批状态
                        "VirtualState": "",         //列表上状态字段需要绑定的值
                        "EmpSumScore": "97",          //上级评分
                        "SelfScore": "97"             //自评分
                    },
                    zhouqi={
                        "ID": "05",                   //目标卡ID
                        "State": "11",                //目标卡的状态
                        "PlanID": "",               //计划ID
                        "CaseID": "",               //方案ID
                        "CycleID": "",              //周期ID
                        "PersonID": "zhouqi",             //人员ID
                        "PersonID_Name": "周七",         //人员姓名
                        "PersonID_Email": "",        //人员Email
                        "Person_ZP": "img/5.png",             //人员照片
                        "AssSubjectID": "",         //被考核人ID
                        "FlowInstID": "",           //流程实例ID
                        "FlowInstID_STATE": "",      //流程实例状态
                        "ApproveState": "",         //审批状态
                        "VirtualState": "",         //列表上状态字段需要绑定的值
                        "EmpSumScore": "97",          //上级评分
                        "SelfScore": "97"             //自评分
                    },
                    zhuba={
                        "ID": "06",                   //目标卡ID
                        "State": "11",                //目标卡的状态
                        "PlanID": "",               //计划ID
                        "CaseID": "",               //方案ID
                        "CycleID": "",              //周期ID
                        "PersonID": "zhuba",             //人员ID
                        "PersonID_Name": "朱八",         //人员姓名
                        "PersonID_Email": "",        //人员Email
                        "Person_ZP": "img/6.png",             //人员照片
                        "AssSubjectID": "",         //被考核人ID
                        "FlowInstID": "",           //流程实例ID
                        "FlowInstID_STATE": "",      //流程实例状态
                        "ApproveState": "",         //审批状态
                        "VirtualState": "",         //列表上状态字段需要绑定的值
                        "EmpSumScore": "97",          //上级评分
                        "SelfScore": "97"             //自评分
                    },
                    zhujiu={
                        "ID": "07",                   //目标卡ID
                        "State": "11",                //目标卡的状态
                        "PlanID": "",               //计划ID
                        "CaseID": "",               //方案ID
                        "CycleID": "",              //周期ID
                        "PersonID": "zhujiu",             //人员ID
                        "PersonID_Name": "朱九",         //人员姓名
                        "PersonID_Email": "",        //人员Email
                        "Person_ZP": "",             //人员照片
                        "AssSubjectID": "",         //被考核人ID
                        "FlowInstID": "",           //流程实例ID
                        "FlowInstID_STATE": "",      //流程实例状态
                        "ApproveState": "",         //审批状态
                        "VirtualState": "",         //列表上状态字段需要绑定的值
                        "EmpSumScore": "97",          //上级评分
                        "SelfScore": "97"             //自评分
                    };

                if (params && params['orderBy'] === 'finishTerm') {
                    dataArray.push(zhangsan);
                    dataArray.push(wangwu);
                    dataArray.push(lisi);
                    dataArray.push(chenliu);
                }
                else if (params && params['orderBy'] === 'id') {
                    dataArray.push(zhangsan);
                    dataArray.push(lisi);
                    dataArray.push(wangwu);
                    dataArray.push(chenliu);
                }
                else if (params && params['orderBy'] === 'weight') {
                    dataArray.push(lisi);
                    dataArray.push(zhangsan);
                    dataArray.push(chenliu);
                    dataArray.push(wangwu);
                }
                else if (params && params['orderBy'] === 'score') {
                    dataArray.push(chenliu);
                    dataArray.push(wangwu);
                    dataArray.push(lisi);
                    dataArray.push(zhangsan);
                }
                else {
                    dataArray.push(zhangsan);
                    dataArray.push(lisi);
                    dataArray.push(wangwu);
                    dataArray.push(chenliu);
                    dataArray.push(zhouqi);
                    dataArray.push(zhuba);
                    dataArray.push(zhujiu);
                }
                return {
                    EmployeeListInstance: ko.observableArray(dataArray)
                };
                //
                //                this.employeeDataSource = gsp.dataSource(result.data, 'EmployeeListInstance');

                //                return $dataService.invokeMethod(this.dataUri, 'GetAuditEmployeeListInfo', [JSON.stringify({UserID: '33d34db5-dfa5-43a8-9cb2-06f5e1ae8db6'})])
                //                    .then(function(result) {
                //                        self.employeeDataSource = gsp.dataSource(result.RelApproPerson, 'EmployeeListInstance');
                //                    });

            }
        };
    }]);
})(window.gsp);