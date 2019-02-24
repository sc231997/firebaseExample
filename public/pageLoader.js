function behaviorCollection() {
    var _ = this;
    // _.url = "https://alohomora.ml";
    _.url = "";
    
    _.actionList = {
        'login': {
            'name': 'login',
            'pageid': 'loginPage'
        },
        'home': {
            'name': 'home',
            'pageid': 'homePage'
        },
        'accounts' : {
            'name': 'accounts',
            'pageid': null
        },
        'makePayment': {
            'name': 'makePayment',
            'pageid': 'makePayment'
        },
        'allAccounts': {
            'name': 'allAccounts',
            'pageid': 'allAccounts'
        },
        'transactionHistory': {
            'name': 'transactionHistory',
            'pageid': 'transactionHistory'
        }
    }
    _.currentPage = null; //_.actionList['login'].pageid;

    _.setEnvironment = function () {
        $('body').click(function (e) {
            e.preventDefault();
        });
        _.setButtonClickHandler();
        $('.menuController').css('display', 'none');

        var user = _.getLocalStorageUser();
        _.currentPage=_.actionList.login.pageid;
        var selectPage=null;
        try{
            if (user!=null && user.name.length > 0 && user.name != undefined)
            {
                selectPage = _.actionList.home.name;
                _.enableAfterLoginControls();
                _.callActions(_.actionList.accounts.name);
            }
            else
                selectPage= _.actionList.login.name;
        }
        catch (e) {
            selectPage = _.actionList.login.name;
        }
        _.switchPage(selectPage);
    }

    _.setButtonClickHandler = function () {
        $('button').each(function (i, v) {
            $(this).click(function (i, v) {
                var action = $(this).attr('action');
                _.callActions(action);
            });
        });
    }

    _.getLocalStorageUser=function(){
        return user = JSON.parse(localStorage.getItem("user"));
    }

    _.callActions=function(action){
        switch (action) {
            case _.actionList.login.name:
                _.login();
                break;
            case _.actionList.accounts.name:
                _.loadAccountsList();
                break;
            default: break;
        }
    }

    _.switchPage = function (action) {
        try{
        var page = _.actionList[action];
        var w = window.innerWidth;
        $('#' + page.pageid).css({ 'z-index': '100000', 'position': 'fixed', 'left': w + 'px', 'top': '0px', 'display': 'block' });
        $('#' + page.pageid).animate(
            {
                'left': '0px'
            },
            {
                complete: function () {
                    $('#' + _.currentPage).css({ 'display': 'none' });
                    _.currentPage = page.pageid;
                    $('#' + _.currentPage).css({ 'position': 'relative', 'display': 'block' });
                }
            }
        );
        }
        catch(e){
            _.logout();
        }
    }

    _.asyncCall = function (action, data, callback) {
        var url = _.url + '/' + action;
        $('.loadingCircle').show();
        $.ajax({
            type: "POST",
            dataType: "json",
            data: data,
            url: url,
            success: function (response) {
                if (callback != null) {
                    response=JSON.parse(JSON.stringify(response));
                    callback(response);
                    $('.loadingCircle').hide();
                }
            },
            error: function (request, e) {
                console.log('ERROR: ');
                console.log(e);
                _.showError('ERROR: '+e);
                $('.loadingCircle').hide();
                _.logout();
            }
        });
    }

    _.showError=function(msg){
        $('#error').html(msg);
        $('#error').css('display','block');
        setTimeout(function(){
            $('#error').css('display','none');
        })
    }

    _.login = function () {
        var userId = $('input[name="userId"]').val();
        var password = $('input[name="password"]').val();
        var data = {'uid': userId , 'passwd': password  };

        _.asyncCall(_.actionList.login.name, data, function (r) {
            _.switchPage(_.actionList.home.name);
            r.uid=userId;
            localStorage.setItem('user', JSON.stringify(r));
            _.enableAfterLoginControls();
            _.callActions(_.actionList.accounts.name);
        });
    }

    _.logout=function(){
        console.log('called')
        localStorage.removeItem('user');
        _.switchPage(_.actionList.login.name);
        $('.logoutController').css('display', 'none');
    }

    _.enableAfterLoginControls=function(){
        $('.logoutController').css('display', 'block');
    },

    _.mapJSONtoHTML=function(data, divId, childElement, needValueElement){
        divId='#'+divId;
        var localid=$(divId).attr('id');
        var control=$(divId);
        var container=$(control).parent();
        var divHTML=$(control)[0].outerHTML;
        $(container).empty();
        $(container).append(divHTML);
        $.each(data, function(i, v){
            $(container).append(divHTML);
            var latestControl=$('#'+$(container).attr('id')+' '+childElement+':last-child');
            $(latestControl).attr('id',localid+i);
            $(latestControl).css('display','block');

            var needValueQuery='#'+$(latestControl).attr('id')+needValueElement+'.needValue';
            $(needValueQuery).each(function(ind, val){
                var mapto=$(this).attr('mapto');
                $(this).html($(this).html()+v[mapto]);
            });
        });
    }

    _.loadAccountsList=function(){
        var user = JSON.parse(localStorage.getItem("user"));
        _.asyncCall(_.actionList.accounts.name, user, function(r){
            
            _.mapJSONtoHTML(r,'accountListControl', 'div', ' td');
        });
    }

    _.loadMakePaymentPage=function(obj){
        var user=_.getLocalStorageUser();
        var fromAccount=$(obj).parent().parent().parent().find('#accountNumber').html();
        var balance=$(obj).parent().parent().parent().find('#accountBalance').html();
        $('#fromAccount').html(fromAccount);
        $('#fromAccountBalance').html(balance);
        var amount=$('#fromAmountToTransfer').val(0);
        _.asyncCall(_.actionList.allAccounts.name, user, function(r){
            _.mapJSONtoHTML(JSON.parse(JSON.stringify(r)).accounts,'SendToAccountListItem', 'option', '');
        });
        _.switchPage(_.actionList.makePayment.pageid);
    }

    _.loadHistory=function(obj){
        var user=_.getLocalStorageUser();
        var acc=$(obj).parent().parent().parent().find('#accountNumber').html();
        var data={
            '__token': user.__token,
            'account_no': acc,
            'uid': user.uid
        }
        _.asyncCall(_.actionList.transactionHistory.name,data, function(r){
            _.mapJSONtoHTML(r.transactions, 'transactionListControl', 'div', ' td');
            _.switchPage(_.actionList.transactionHistory.pageid);
        });

        $
    }

    _.makeTransaction=function(){
        var user=_.getLocalStorageUser();
        var fromAcc=$('#fromAccount').html();
        var toAcc=$('#SendToAccountList').find(":selected").text();
        var amount=$('#fromAmountToTransfer').val();
        var data={
            'uid':user.uid,
            '__token': user.__token,
            'from': fromAcc*1,
            'to': toAcc*1,
            'amount': amount*1
        };
        _.asyncCall('makeTransaction', data, function(r){
            _.loadAccountsList();
            _.moveBack(_.actionList.home.name);
        });
    }

    _.moveBack=function(moveTo){
        _.switchPage(moveTo);
    }
}

var hooghlyBehavior = new behaviorCollection();

$(document).ready(function () {
    // localStorage.removeItem('user');
    hooghlyBehavior.setEnvironment();
});